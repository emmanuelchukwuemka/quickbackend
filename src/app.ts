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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Mock Data Replacement Routes
app.get('/api/cities', async (req: Request, res: Response) => {
  try {
    let cities = await City.find({});
    if (cities.length === 0) {
      cities = await City.insertMany([
        { location_name: 'San Francisco, CA', Latlng: { lat: 37.7749, lng: -122.4194 } },
        { location_name: 'Los Angeles, CA', Latlng: { lat: 34.0522, lng: -118.2437 } },
        { location_name: 'New York, NY', Latlng: { lat: 40.7128, lng: -74.0060 } }
      ]);
    }
    res.json(cities);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/rideOptions', async (req: Request, res: Response) => {
  try {
    let options = await RideOption.find({});
    if (options.length === 0) {
      options = await RideOption.insertMany([
        { Type: 'Standard', price: '25.00', features: '4 seats', numbersofseats: '4' },
        { Type: 'Premium', price: '45.00', features: 'Luxury, 4 seats', numbersofseats: '4' },
        { Type: 'XL', price: '35.00', features: '6 seats', numbersofseats: '6' }
      ]);
    }
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
