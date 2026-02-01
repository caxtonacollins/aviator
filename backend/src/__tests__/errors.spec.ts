import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors.ts';

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create error with correct status code', () => {
      const error = new AppError('Test error', 500);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Test error');
    });

    it('should set status to "fail" for 4xx errors', () => {
      const error400 = new AppError('Bad request', 400);
      const error404 = new AppError('Not found', 404);
      const error422 = new AppError('Unprocessable', 422);
      
      expect(error400.status).toBe('fail');
      expect(error404.status).toBe('fail');
      expect(error422.status).toBe('fail');
    });

    it('should set status to "error" for 5xx errors', () => {
      const error500 = new AppError('Server error', 500);
      const error503 = new AppError('Service unavailable', 503);
      
      expect(error500.status).toBe('error');
      expect(error503.status).toBe('error');
    });

    it('should mark as operational error', () => {
      const error = new AppError('Operational error', 400);
      expect(error.isOperational).toBe(true);
    });

    it('should have a stack trace', () => {
      const error = new AppError('Stack trace test', 500);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack!.length).toBeGreaterThan(0);
    });

    it('should be instance of Error', () => {
      const error = new AppError('Instance test', 400);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('NotFoundError', () => {
    it('should default to 404 status code', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
    });

    it('should use default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('User not found');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('should have status "fail"', () => {
      const error = new NotFoundError();
      expect(error.status).toBe('fail');
    });

    it('should be instance of AppError', () => {
      const error = new NotFoundError();
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should default to 400 status code', () => {
      const error = new ValidationError();
      expect(error.statusCode).toBe(400);
    });

    it('should use default message', () => {
      const error = new ValidationError();
      expect(error.message).toBe('Validation failed');
    });

    it('should accept custom message', () => {
      const error = new ValidationError('Invalid email format');
      expect(error.message).toBe('Invalid email format');
      expect(error.statusCode).toBe(400);
    });

    it('should have status "fail"', () => {
      const error = new ValidationError();
      expect(error.status).toBe('fail');
    });

    it('should be instance of AppError', () => {
      const error = new ValidationError();
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('UnauthorizedError', () => {
    it('should default to 401 status code', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
    });

    it('should use default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Not authorized');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });

    it('should have status "fail"', () => {
      const error = new UnauthorizedError();
      expect(error.status).toBe('fail');
    });

    it('should be instance of AppError', () => {
      const error = new UnauthorizedError();
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ForbiddenError', () => {
    it('should default to 403 status code', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
    });

    it('should use default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Forbidden');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
    });

    it('should have status "fail"', () => {
      const error = new ForbiddenError();
      expect(error.status).toBe('fail');
    });

    it('should be instance of AppError', () => {
      const error = new ForbiddenError();
      expect(error).toBeInstanceOf(AppError);
    });
  });
});
