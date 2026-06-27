import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import { initDb } from './db';

// Import Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import driverRoutes from './routes/driverRoutes';
import rideRoutes from './routes/rideRoutes';
import scheduledRideRoutes from './routes/scheduledRideRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import uploadRoutes from './routes/uploadRoutes';
import path from 'path';

import City from './models/City';
import RideOption from './models/RideOption';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (like uploaded images)
app.use(express.static(path.join(__dirname, '../public')));

app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    fs.appendFileSync('requests.log', `${new Date().toISOString()} ${req.method} ${req.url} ${JSON.stringify(req.body)}\n`);
  } catch (e) {}
  next();
});

// Basic Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'Backend is running' });
});

// DB diagnostic — lists existing tables
app.get('/api/debug/tables', async (req: Request, res: Response) => {
  try {
    const { query } = await import('./db');
    const result = await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    res.json({ tables: result.rows.map((r: any) => r.tablename) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/scheduled-rides', scheduledRideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Mock Data Replacement Routes
app.get('/api/cities', async (req: Request, res: Response) => {
  try {
    let cities = await City.find({});
    res.json(cities);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/rideOptions', async (req: Request, res: Response) => {
  try {
    let options = await RideOption.find({});
    res.json(options);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

import { createServer } from 'http';
import { Server } from 'socket.io';
import { initSockets } from './sockets/socketManager';

const PORT = process.env.PORT || 5000;
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

initSockets(io);

const connectDB = async () => {
  try {
    await initDb();
    // Add fcm_token column if it doesn't exist (idempotent migration)
    try {
      const { query } = await import('./db');
      await query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS fcm_token VARCHAR DEFAULT ''`);
    } catch (e) { /* column may already exist */ }
    console.log('Connected to PostgreSQL');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to PostgreSQL', err);
  }
};

if (require.main === module) {
  connectDB();
}

export default app;
