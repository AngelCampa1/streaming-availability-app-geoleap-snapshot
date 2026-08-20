import { spawn, ChildProcess, execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
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
      if (response.ok) {
        console.log(`✓ Health check passed: ${url}`);
        return;
      }
    } catch (_error) {
      console.log(`Waiting for health check ${url}... (attempt ${i + 1}/${maxRetries})`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Health check failed for ${url} after ${maxRetries} attempts`);
}

// Get Docker command with proper PATH on Windows
function getDockerPath(): string {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    // Add common Docker paths for Windows
    const dockerPaths = [
      'C:\\Program Files\\Docker\\Docker\\resources\\bin',
      'C:\\ProgramData\\DockerDesktop\\version-bin',
      'C:\\Windows\\System32',
    ];
    
    // Check if docker command is available
    try {
      execSync('docker --version', { stdio: 'ignore' });
      return 'docker';
    } catch (_error) {
      // Docker not found in PATH, try to add it
      process.env.PATH = `${process.env.PATH};${dockerPaths.join(';')}`;
      
      // Try again after adding to PATH
      try {
        execSync('docker --version', { stdio: 'ignore' });
        return 'docker';
      } catch (_error2) {
        throw new Error('Docker Desktop is not installed or not running. Please start Docker Desktop first.');
      }
    }
  }
  return 'docker';
}

export async function startDockerServices(): Promise<void> {
  console.log('Starting Docker services...');
  
  try {
    const dockerCmd = getDockerPath();
    
    // Always start docker-compose (it will skip if already running)
    // This is more reliable than checking container status
    try {
      await execAsync('docker-compose -f docker-compose.dev.yml up -d', {
        cwd: PROJECT_ROOT,
      });
    } catch (_error) {
      // Try docker compose (newer syntax)
      await execAsync(`${dockerCmd} compose -f docker-compose.dev.yml up -d`, {
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
    console.error('Failed to start Docker services:', error);
    throw error;
  }
}

export async function startBackend(): Promise<void> {
  console.log('Starting backend API...');
  
  // First check if backend is already running (even if unhealthy, we'll use it)
  try {
    await fetch('http://localhost:8020/api/health', { 
      signal: AbortSignal.timeout(2000) 
    });
    // Any response means backend is running
    console.log('✓ Backend API already running (will be used for tests)');
    return;
  } catch (_error) {
    // Backend not responding, need to start it
  }
  
  const backendPath = path.join(PROJECT_ROOT, 'backend', 'GeoLeap.Api');
  
  return new Promise((resolve, reject) => {
    const backend = spawn('dotnet', ['run', '--no-launch-profile'], {
      cwd: backendPath,
      env: {
        ...process.env,
        ASPNETCORE_URLS: 'http://localhost:8020',
        ASPNETCORE_ENVIRONMENT: 'Development',
      },
      shell: true,
    });

    processes.backend = backend;

    let output = '';
    
    backend.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (text.includes('Application started') || text.includes('Now listening on')) {
        console.log('✓ Backend API started');
        // Wait for health check with extended timeout (60 retries × 3 seconds = 180 seconds total)
        waitForHealthCheck('http://localhost:8020/api/health', 60, 3000)
          .then(() => resolve())
          .catch(reject);
      }
    });

    backend.stderr?.on('data', (data) => {
      console.error('Backend error:', data.toString());
    });

    backend.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backend.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Backend exited with code ${code}`));
      }
    });

    // Timeout fallback - check health endpoint instead of error strings
    // Increased timeout to 180 seconds (3 minutes) for initial build
    setTimeout(() => {
      waitForHealthCheck('http://localhost:8020/api/health', 60, 3000)
        .then(() => resolve())
        .catch(() => {
          if (output.toLowerCase().includes('build failed') || output.toLowerCase().includes('fatal error')) {
            reject(new Error('Backend failed to start with critical errors'));
          } else {
            console.log('Backend output:', output.slice(-500)); // Log last 500 chars
            reject(new Error('Backend health check failed after timeout'));
          }
        });
    }, 180000);
  });
}

export async function startFrontend(): Promise<void> {
  console.log('Starting frontend dev server...');
  
  // First check if frontend is already running
  try {
    await fetch('http://localhost:3020', { 
      signal: AbortSignal.timeout(2000) 
    });
    // Any response (including 404) means frontend is running
    console.log('✓ Frontend dev server already running');
    return;
  } catch (_error) {
    // Frontend not responding, need to start it
  }
  
  const frontendPath = path.join(PROJECT_ROOT, 'frontend');
  
  return new Promise((resolve, reject) => {
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendPath,
      env: {
        ...process.env,
        PORT: '3020',
        NEXT_PUBLIC_API_URL: 'http://localhost:8020',
      },
      shell: true,
    });

    processes.frontend = frontend;

    let output = '';
    
    frontend.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (text.includes('Local:') || text.includes('ready') || text.includes('started')) {
        console.log('✓ Frontend dev server started');
        // Wait for frontend to be accessible
        waitForPort(3020, 30, 2000)
          .then(() => resolve())
          .catch(reject);
      }
    });

    frontend.stderr?.on('data', (data) => {
      const text = data.toString();
      // Next.js outputs some logs to stderr, so only log actual errors
      if (text.includes('Error') || text.includes('ERROR')) {
        console.error('Frontend error:', text);
      }
    });

    frontend.on('error', (error) => {
      console.error('Failed to start frontend:', error);
      reject(error);
    });

    frontend.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Frontend exited with code ${code}`));
      }
    });

    // Timeout fallback
    setTimeout(() => {
      waitForPort(3020, 10, 2000)
        .then(() => resolve())
        .catch(() => reject(new Error('Frontend failed to start within timeout')));
    }, 90000);
  });
}

export async function startAllServices(): Promise<void> {
  console.log('=== Starting All Services ===\n');
  
  try {
    // Start Docker services first (SQL Server and Redis)
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
  
  // Stop Docker services
  try {
    console.log('Stopping Docker services...');
    const dockerCmd = getDockerPath();
    try {
      await execAsync('docker-compose -f docker-compose.dev.yml down', {
        cwd: PROJECT_ROOT,
      });
    } catch (_error) {
      await execAsync(`${dockerCmd} compose -f docker-compose.dev.yml down`, {
        cwd: PROJECT_ROOT,
      });
    }
    console.log('✓ Docker services stopped');
  } catch (error) {
    console.error('Error stopping Docker services:', error);
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
