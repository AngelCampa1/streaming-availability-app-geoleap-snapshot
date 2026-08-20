import { FullConfig } from '@playwright/test';
import { stopAllServices } from './utils/server-manager-fallback';
import { teardownDatabase } from './utils/database-setup';

async function globalTeardown(_config: FullConfig) {
  console.log('\n=== GLOBAL TEARDOWN: Cleaning up E2E Test Environment ===\n');
  
  try {
    // Clean database
    await teardownDatabase();
    
    // Stop all services
    await stopAllServices();
    
    console.log('=== Global Teardown Complete ===\n');
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw - allow process to exit
  }
}

export default globalTeardown;
