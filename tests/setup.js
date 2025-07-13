// Jest setup file for database tests
require('dotenv').config({ path: '.env.local' });

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  // Helper to create test user (if needed)
  async createTestUser() {
    // Implementation depends on your auth setup
    return null;
  },
  
  // Helper to clean up test data
  async cleanup() {
    // Clean up any test data created during tests
    console.log('Test cleanup completed');
  }
};

// Setup before all tests
beforeAll(async () => {
  console.log('Setting up database tests...');
  
  // Verify environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for database tests');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for database tests');
  }
});

// Cleanup after all tests
afterAll(async () => {
  await global.testUtils.cleanup();
});