import { spawn, ChildProcess, execSync, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

export interface ServerProcesses {
  docker?: ChildProcess;
  backend?: ChildProcess;
  frontend?: ChildProcess;
}

const processes: ServerProcesses = {};
const PROJECT_ROOT = path.resolve(__dirname, '../..');

async function waitForPort(port: number, maxRetries = 30, interval = 2000): Promise<void> {
  const net = await import('net');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        
        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
        
        socket.on('error', (err) => {
          socket.destroy();
          reject(err);
        });
        
        socket.connect(port, 'localhost');
      });
      
      console.log(`✓ Port ${port} is ready`);
      return;
    } catch (_error) {
      console.log(`Waiting for port ${port}... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  throw new Error(`Port ${port} did not become available after ${maxRetries} attempts`);
}

async function waitForHealthCheck(url: string, maxRetries = 30, interval = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.status === 200) {
        console.log(`✓ Health check passed: ${url}`);
        return;
      } else if (response.status >= 500 && response.status < 600) {
        // Check if it's a database connection error
        const responseText = await response.text();
        if (responseText.toLowerCase().includes('database') ||
            responseText.toLowerCase().includes('connection') ||
            responseText.toLowerCase().includes('sql')) {
          console.error(`❌ Database connection error detected: ${url} (${response.status})`);
          console.error('   Backend cannot connect to database - aborting tests');
          throw new Error(`Database connection failed: ${responseText.substring(0, 200)}`);
        }
        // Other server errors but server is running
        console.log(`✓ Server is running (some issues expected): ${url} (${response.status})`);
        return;
      }
    } catch (_error) {
      console.log(`Waiting for health check ${url}... (attempt ${i + 1}/${maxRetries})`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Health check failed for ${url} after ${maxRetries} attempts`);
}

// Check if Docker is available
function isDockerAvailable(): boolean {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch (_error) {
    return false;
  }
}

export async function startDockerServices(): Promise<void> {
  console.log('Starting Docker services...');

  if (!isDockerAvailable()) {
    console.error('❌ Docker is not available or not running');
    console.error('   Please start Docker Desktop and ensure it is accessible');
    console.error('   E2E tests cannot run without database services');
    throw new Error('Docker is required for E2E tests - please start Docker Desktop');
  }

  try {
    // Always start docker-compose (it will skip if already running)
    // This is more reliable than checking container status
    try {
      await execAsync('docker-compose -f docker-compose.dev.yml up -d', {
        cwd: PROJECT_ROOT,
      });
    } catch (_error) {
      // Try docker compose (newer syntax)
      await execAsync('docker compose -f docker-compose.dev.yml up -d', {
        cwd: PROJECT_ROOT,
      });
    }

    console.log('Waiting for Docker services to be ready...');

    // Wait for SQL Server (port 9020)
    await waitForPort(9020, 40, 3000);

    // Wait for Redis (port 6379)
    await waitForPort(6379, 20, 2000);

    // Give SQL Server extra time to fully initialize
    console.log('Waiting for SQL Server to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('✓ Docker services started successfully');
  } catch (error) {
    console.error('❌ Docker services failed to start');
    console.error('   Error:', (error as Error).message);
    console.error('   E2E tests cannot proceed without database services');
    throw new Error(`Docker services failed to start: ${(error as Error).message}`);
  }
}

export async function startBackend(): Promise<void> {
  console.log('Starting backend API...');
  
  // Enhanced check if backend is already running and healthy
  const isBackendHealthy = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8020/api/health', { 
        signal: AbortSignal.timeout(3000) 
      });
      
      // Check if it's actually our backend API
      const text = await response.text();
      const isOurBackend = text.includes('GeoLeap') ||
                          text.includes('health') ||
                          text.includes('status') ||
                          response.url.includes('localhost:8020');
      
      if (isOurBackend) {
        console.log('✓ Backend API already running and healthy');
        return true;
      }
      
      console.log('⚠️  Port 8020 is in use but not by our backend');
      return false;
    } catch (_error) {
      return false;
    }
  };
  
  // Check if backend is already running and healthy
  if (await isBackendHealthy()) {
    return;
  }
  
  // Try to kill any existing process on port 8020 that's not our backend
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      try {
        await execAsync('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :8020 ^| findstr LISTENING\') do taskkill /F /PID %a');
        console.log('Killed existing process on port 8020');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for port to be released
      } catch (_error) {
        // No process to kill or command failed
      }
    } else {
      try {
        await execAsync('lsof -ti:8020 | xargs kill -9');
        console.log('Killed existing process on port 8020');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for port to be released
      } catch (_error) {
        // No process to kill or command failed
      }
    }
  } catch (_error) {
    // Continue anyway
  }
  
  const backendPath = path.join(PROJECT_ROOT, 'backend', 'GeoLeap.Api');
  
  return new Promise((resolve, reject) => {
    const backend = spawn('dotnet', ['run', '--no-launch-profile'], {
      cwd: backendPath,
      env: {
        ...process.env,
        ASPNETCORE_URLS: 'http://localhost:8020',
        // Use Testing environment for tests to skip Redis
        ASPNETCORE_ENVIRONMENT: 'Testing',
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    processes.backend = backend;

    let output = '';
    let hasStarted = false;
    
    const checkStarted = (text: string) => {
      if (hasStarted) return;
      
      if (text.includes('Application started') || text.includes('Now listening on') || text.includes('Hosting environment')) {
        hasStarted = true;
        console.log('✓ Backend API started');
        // Wait for health check with extended timeout
        setTimeout(() => {
          waitForHealthCheck('http://localhost:8020/api/health', 60, 3000)
            .then(() => resolve())
            .catch(reject);
        }, 5000);
      }
    };
    
    backend.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('Backend:', text.trim());
      checkStarted(text);
    });

    backend.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Only log actual errors, not warnings or info
      if (text.includes('Error') || text.includes('FATAL') || text.includes('error:')) {
        console.error('Backend error:', text);
      } else {
        console.log('Backend:', text.trim());
      }
      checkStarted(text);
    });

    backend.on('error', (error) => {
      console.error('Failed to start backend:', error);
      if (!hasStarted) reject(error);
    });

    backend.on('exit', (code) => {
      if (code !== 0 && code !== null && !hasStarted) {
        reject(new Error(`Backend exited with code ${code}\nOutput: ${output.slice(-1000)}`));
      }
    });

    // Timeout fallback with better error reporting
    setTimeout(() => {
      if (!hasStarted) {
        waitForHealthCheck('http://localhost:8020/api/health', 30, 3000)
          .then(() => {
            console.log('✓ Backend started (detected via health check)');
            resolve();
          })
          .catch(() => {
            if (output.toLowerCase().includes('build failed') || output.toLowerCase().includes('fatal error')) {
              reject(new Error(`Backend failed to start with critical errors\nOutput: ${output.slice(-1000)}`));
            } else {
              reject(new Error(`Backend health check failed after timeout\nLast output: ${output.slice(-1000)}`));
            }
          });
      }
    }, 180000); // 3 minutes for initial build
  });
}

export async function startFrontend(): Promise<void> {
  console.log('Starting frontend dev server...');
  
  // Enhanced check if frontend is already running and healthy
  const isFrontendHealthy = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3020', { 
        signal: AbortSignal.timeout(3000) 
      });
      
      // Check if it's actually a Next.js frontend (not some other service)
      const text = await response.text();
      const isNextJsApp = text.includes('Next.js') ||
                         text.includes('__NEXT_DATA__') ||
                         text.includes('geoLeap') ||
                         text.includes('GeoLeap') ||
                         response.url.includes('localhost:3020');
      
      if (isNextJsApp) {
        console.log('✓ Frontend dev server already running and healthy');
        return true;
      }
      
      console.log('⚠️  Port 3020 is in use but not by our frontend');
      return false;
    } catch (_error) {
      return false;
    }
  };
  
  // Check if frontend is already running and healthy
  if (await isFrontendHealthy()) {
    return;
  }
  
  // Try to kill any existing process on port 3020 that's not our frontend
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      try {
        await execAsync('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3020 ^| findstr LISTENING\') do taskkill /F /PID %a');
        console.log('Killed existing process on port 3020');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for port to be released
      } catch (_error) {
        // No process to kill or command failed
      }
    } else {
      try {
        await execAsync('lsof -ti:3020 | xargs kill -9');
        console.log('Killed existing process on port 3020');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for port to be released
      } catch (_error) {
        // No process to kill or command failed
      }
    }
  } catch (_error) {
    // Continue anyway
  }
  
  const frontendPath = path.join(PROJECT_ROOT, 'frontend');
  
  return new Promise((resolve, reject) => {
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendPath,
      env: {
        ...process.env,
        PORT: '3020',
        NEXT_PUBLIC_API_URL: 'http://localhost:8020',
        NODE_ENV: 'development',
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    processes.frontend = frontend;

    let output = '';
    let hasStarted = false;
    
    const checkStarted = (text: string) => {
      if (hasStarted) return;
      
      if (text.includes('Local:') && text.includes('3020')) {
        hasStarted = true;
        console.log('✓ Frontend dev server started on port 3020');
        // Wait a bit more for the app to be fully ready
        setTimeout(() => {
          waitForPort(3020, 15, 2000)
            .then(() => resolve())
            .catch(reject);
        }, 3000);
      } else if (text.includes('ready') || text.includes('started server')) {
        hasStarted = true;
        console.log('✓ Frontend dev server started');
        setTimeout(() => {
          waitForPort(3020, 15, 2000)
            .then(() => resolve())
            .catch(reject);
        }, 3000);
      }
    };
    
    frontend.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('Frontend:', text.trim());
      checkStarted(text);
    });

    frontend.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Next.js outputs some logs to stderr, so only log actual errors
      if (text.includes('Error') || text.includes('ERROR') || text.includes('error:')) {
        console.error('Frontend error:', text);
      } else {
        console.log('Frontend:', text.trim());
      }
      checkStarted(text);
    });

    frontend.on('error', (error) => {
      console.error('Failed to start frontend:', error);
      if (!hasStarted) reject(error);
    });

    frontend.on('exit', (code) => {
      if (code !== 0 && code !== null && !hasStarted) {
        reject(new Error(`Frontend exited with code ${code}\nOutput: ${output.slice(-1000)}`));
      }
    });

    // Timeout fallback with better error reporting
    setTimeout(() => {
      if (!hasStarted) {
        waitForPort(3020, 10, 2000)
          .then(() => {
            console.log('✓ Frontend started (detected via port check)');
            resolve();
          })
          .catch(() => {
            reject(new Error(`Frontend failed to start within timeout\nLast output: ${output.slice(-1000)}`));
          });
      }
    }, 120000); // Increased to 2 minutes
  });
}

export async function startAllServices(): Promise<void> {
  console.log('=== Starting All Services ===\n');
  
  try {
    // Start Docker services first (SQL Server and Redis) - optional
    await startDockerServices();
    
    // Start backend and frontend in parallel
    await Promise.all([
      startBackend(),
      startFrontend(),
    ]);
    
    console.log('\n✓ All services started successfully!\n');
  } catch (error) {
    console.error('Failed to start services:', error);
    await stopAllServices();
    throw error;
  }
}

export async function stopAllServices(): Promise<void> {
  console.log('\n=== Stopping All Services ===\n');
  
  // Stop frontend
  if (processes.frontend) {
    console.log('Stopping frontend...');
    processes.frontend.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (!processes.frontend.killed) {
      processes.frontend.kill('SIGKILL');
    }
  }
  
  // Stop backend
  if (processes.backend) {
    console.log('Stopping backend...');
    processes.backend.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (!processes.backend.killed) {
      processes.backend.kill('SIGKILL');
    }
  }
  
  // Stop Docker services only if Docker is available
  if (isDockerAvailable()) {
    try {
      console.log('Stopping Docker services...');
      try {
        await execAsync('docker-compose -f docker-compose.dev.yml down', {
          cwd: PROJECT_ROOT,
        });
      } catch (_error) {
        await execAsync('docker compose -f docker-compose.dev.yml down', {
          cwd: PROJECT_ROOT,
        });
      }
      console.log('✓ Docker services stopped');
    } catch (error) {
      console.error('Error stopping Docker services:', error);
    }
  }
  
  console.log('✓ All services stopped\n');
}

// Handle cleanup on process exit
process.on('SIGINT', async () => {
  await stopAllServices();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopAllServices();
  process.exit(0);
});
