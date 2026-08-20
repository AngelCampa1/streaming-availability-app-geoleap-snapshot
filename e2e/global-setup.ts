import { FullConfig } from '@playwright/test';
import { startAllServices } from './utils/server-manager-fallback';

async function globalSetup(_config: FullConfig) {
  console.log('\n=== GLOBAL SETUP: Starting E2E Test Environment ===\n');
  
  try {
    // Start all services (Docker, Backend, Frontend)
    await startAllServices();
    
    console.log('=== Global Setup Complete ===\n');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
