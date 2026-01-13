import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { createServer } from 'http';
import { config } from 'dotenv';
import { Server } from 'socket.io';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

const server = createServer(app);

const io = new Server(server);

io.on('connection', (socket) => {
  console.log('New WebSocket connection');

  socket.on('message', (message: string) => {
    console.log('Received:', message);
    // Echo the message back to the client
    socket.emit(`Server received: ${message}`);
  });

  socket.on('close', () => {
    console.log('Client disconnected');
  });
});

// 404 handler for unhandled routes
app.all('*', notFoundHandler);

app.use(errorHandler);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
  next();
});


process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason.message || reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
