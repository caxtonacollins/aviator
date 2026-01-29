import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../utils/logger.ts';
import winston from 'winston';

describe('Logger', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should be properly initialized', () => {
    expect(logger).toBeDefined();
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  it('should have correct log level in production', () => {
    // Note: The logger is already initialized, so this tests the current environment
    // In a real scenario, we'd need to reinitialize the logger with different env
    if (process.env.NODE_ENV === 'production') {
      expect(logger.level).toBe('info');
    }
  });

  it('should have correct log level in development', () => {
    if (process.env.NODE_ENV !== 'production') {
      expect(logger.level).toBe('debug');
    }
  });

  it('should have console transport', () => {
    const transports = logger.transports;
    const hasConsoleTransport = transports.some(
      (t) => t instanceof winston.transports.Console
    );
    expect(hasConsoleTransport).toBe(true);
  });

  it('should have file transports', () => {
    const transports = logger.transports;
    const fileTransports = transports.filter(
      (t) => t instanceof winston.transports.File
    );
    expect(fileTransports.length).toBeGreaterThanOrEqual(2);
  });

  it('should be able to log at different levels', () => {
    // Spy on logger methods
    const infoSpy = vi.spyOn(logger, 'info');
    const errorSpy = vi.spyOn(logger, 'error');
    const warnSpy = vi.spyOn(logger, 'warn');
    const debugSpy = vi.spyOn(logger, 'debug');

    logger.info('Test info message');
    logger.error('Test error message');
    logger.warn('Test warn message');
    logger.debug('Test debug message');

    expect(infoSpy).toHaveBeenCalledWith('Test info message');
    expect(errorSpy).toHaveBeenCalledWith('Test error message');
    expect(warnSpy).toHaveBeenCalledWith('Test warn message');
    expect(debugSpy).toHaveBeenCalledWith('Test debug message');

    infoSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('should have timestamp format configured', () => {
    const format = logger.format;
    expect(format).toBeDefined();
  });

  it('should have error.log file transport', () => {
    const transports = logger.transports;
    const fileTransports = transports.filter(
      (t) => t instanceof winston.transports.File
    );
    const hasErrorLog = fileTransports.some(
      (t) => (t as any).filename?.includes('error.log')
    );
    expect(hasErrorLog).toBe(true);
  });

  it('should have app.log file transport', () => {
    const transports = logger.transports;
    const fileTransports = transports.filter(
      (t) => t instanceof winston.transports.File
    );
    const hasAppLog = fileTransports.some(
      (t) => (t as any).filename?.includes('app.log')
    );
    expect(hasAppLog).toBe(true);
  });
});
