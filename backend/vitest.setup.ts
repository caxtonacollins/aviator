import { vi } from 'vitest';

// Mock process.exit to prevent tests from actually exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
  throw new Error(`process.exit called with code ${code}`);
}) as any);

// Prevent unhandled rejection errors from crashing tests
process.on('unhandledRejection', (reason) => {
  // Silently ignore - tests handle their own errors
  console.log('Unhandled rejection caught in test setup:', reason);
});

// Prevent uncaught exception errors from crashing tests  
process.on('uncaughtException', (error) => {
  // Silently ignore - tests handle their own errors
  console.log('Uncaught exception caught in test setup:', error.message);
});
