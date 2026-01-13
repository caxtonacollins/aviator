import { AppError } from '../errors/errors.ts';
import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let error = { ...err } as any;
    error.message = err.message;

    // Log to console for development
    console.error('Error Middleware:', err.stack);

    // Handle specific error types
    if (err.name === 'CastError') {
        const message = `Resource not found`;
        error = new AppError(message, 404);
    }

    // Handle duplicate field errors
    if ((err as any).code === 11000) {
        const message = 'Duplicate field value entered';
        error = new AppError(message, 400);
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        const message = Object.values((err as any).errors)
            .map((val: any) => val.message)
            .join('. ');
        error = new AppError(message, 400);
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new AppError(message, 401);
    }

    // Handle JWT expired error
    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new AppError(message, 401);
    }

    // Default to 500 error if status code not set
    const statusCode = error.statusCode || 500;
    const status = error.status || 'error';

    // Send response
    res.status(statusCode).json({
        status,
        message: error.message || 'Internal Server Error',
        // Only include stack trace in development
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
};

// 404 handler - catch all unhandled routes
export const notFoundHandler: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

// Async error handler wrapper
export const catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};