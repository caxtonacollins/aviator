import 'reflect-metadata';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { createServer } from 'http';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import morgan from 'morgan';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.ts';
import { GameEngine } from './services/game-engine.service.ts';
import { logger } from './utils/logger.ts';
import { createRoundsRouter } from './routes/rounds.ts';
import leaderboardRouter from './routes/leaderboard.ts';
import historyRouter from './routes/history.ts';
import adminRouter from './routes/admin.ts';
import { AppDataSource } from '@/config/database.ts';

config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://aviator.farcast.app' 
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// GameEngine setup
const server = createServer(app);
const io = new Server(server);
const gameEngine = new GameEngine(io);

// Routes with dependency injection
app.use('/api/rounds', createRoundsRouter(gameEngine));
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/history', historyRouter);
app.use('/api/admin', adminRouter);

io.on('connection', (socket) => {
  logger.info('New WebSocket connection');

  socket.on('message', (message: string) => {
    logger.info(`Received: ${message}`);
    // Echo the message back to the client
    socket.emit(`Server received: ${message}`);
  });

  socket.on('close', () => {
    logger.info('Client disconnected');
  });
});

// Initialize DB and start server
(async () => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected');
    // Start game engine
    logger.info('Database connected');
    // Start game engine
    await gameEngine.start();
    server.listen(port, () => {
      logger.info(`Server is running on http://localhost:${port}`);
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.stack || err.message : JSON.stringify(err);
    logger.error(`Failed to initialize database: ${errorMessage}`);
    if (String(errorMessage).includes('does not exist')) {
      logger.error('Database not found.', errorMessage);
    }
    process.exit(1);
  }
})();

// 404 handler for unhandled routes
app.use(notFoundHandler);

app.use(errorHandler);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Uncaught Exception: ${err.message}`, {
    stack: err.stack,
  });
  res.status(500).json({ error: 'Something went wrong!' });
  next();
});

process.on('unhandledRejection', (reason: Error) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`, {
    stack: reason?.stack,
  });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, {
    stack: err.stack,
  });
  server.close(() => process.exit(1));
});

export default app;
