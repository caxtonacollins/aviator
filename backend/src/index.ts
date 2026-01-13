import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createServer } from 'http';
import { config } from 'dotenv';
import { Server } from 'socket.io';

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

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
