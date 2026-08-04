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
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import promoCodeRoutes from './routes/promoCodeRoutes';
import complaintRoutes from './routes/complaintRoutes';
import notificationRoutes from './routes/notificationRoutes';
import settingsRoutes from './routes/settingsRoutes';
import fareSettingsRoutes from './routes/fareSettingsRoutes';
import adminAlertRoutes from './routes/adminAlertRoutes';
import paymentGatewayRoutes from './routes/paymentGatewayRoutes';
import uploadRoutes from './routes/uploadRoutes';
import path from 'path';

import City from './models/City';
import RideOption from './models/RideOption';
import { seedDefaultAdmin } from './controllers/adminAuthController';

const app: Application = express();

const defaultCities = [
  { location_name: 'San Francisco, CA', Latlng: { lat: 37.7749, lng: -122.4194 } },
  { location_name: 'Los Angeles, CA', Latlng: { lat: 34.0522, lng: -118.2437 } },
  { location_name: 'New York, NY', Latlng: { lat: 40.7128, lng: -74.0060 } },
];

const defaultRideOptions = [
  { Type: 'Standard', price: '25.00', features: '4 seats', numbersofseats: '4' },
  { Type: 'Premium', price: '45.00', features: 'Luxury, 4 seats', numbersofseats: '4' },
  { Type: 'XL', price: '35.00', features: '6 seats', numbersofseats: '6' },
];

const ensureReferenceData = async () => {
  const cities = await City.find({});
  if (!cities.length) {
    await City.insertMany(defaultCities);
  }

  const rideOptions = await RideOption.find({});
  if (!rideOptions.length) {
    await RideOption.insertMany(defaultRideOptions);
  }
};

// Middleware
app.use(cors());
// Stash the raw request body bytes alongside the parsed req.body — the
// Paystack webhook handler needs the exact raw bytes to verify its HMAC
// signature (re-serializing req.body would not byte-for-byte match what
// Paystack actually signed).
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// Serve the marketing landing page (static site built from ./landing via
// `npm run build` inside that folder) at the root domain. Only serves exact
// file matches (index.html for '/', plus its assets) — everything else
// (API routes, /admin) falls through untouched.
app.use(express.static(path.join(__dirname, '../landing/dist')));

// Serve static files (like uploaded images)
app.use(express.static(path.join(__dirname, '../public')));

// Serve the admin dashboard (React SPA built from ./admin via `npm run build`
// inside that folder) at /admin. The fallback middleware handles client-side
// routes (e.g. /admin/drivers) that don't correspond to a static file.
const adminDistPath = path.join(__dirname, '../admin/dist');
app.use('/admin', express.static(adminDistPath));
app.use('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(adminDistPath, 'index.html'));
});

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
app.use('/api/payments/gateway', paymentGatewayRoutes);
// More specific /api/admin/* prefixes must be registered before the
// catch-all /api/admin mount below — adminRoutes applies its auth
// middleware to every request that enters it, including ones that don't
// match any of its own routes, so it would otherwise intercept and reject
// these before they ever reached their real handlers.
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/promo-codes', promoCodeRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/fare-settings', fareSettingsRoutes);
app.use('/api/admin/alerts', adminAlertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
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
import { dispatchScheduledRides } from './utils/scheduledRideDispatcher';
import { sendScheduledRideReminders } from './utils/scheduledRideReminders';

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
    console.log('[startup] connecting to database...');
    await initDb();
    console.log('[startup] initDb complete, seeding reference data...');
    await ensureReferenceData();
    await seedDefaultAdmin();
    console.log('[startup] reference data ready');
    console.log('Connected to database');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Run immediately to catch any rides that became due while server was down
      setTimeout(dispatchScheduledRides, 5000);
      setTimeout(sendScheduledRideReminders, 8000);

      // Then check every 60 seconds
      setInterval(dispatchScheduledRides, 60 * 1000);
      setInterval(sendScheduledRideReminders, 60 * 1000);
      console.log('[Scheduler] Scheduled ride dispatcher and reminders checks started (every 60s)');
    });
  } catch (err) {
    console.error('Failed to connect to database', err);
  }
};

// require.main === module fails to detect the real entrypoint under Phusion
// Passenger (cPanel/CloudLinux Node hosting), which requires the app as a
// module rather than running it directly — so the server silently never
// started. NODE_ENV=test (set automatically by Jest) is what actually needs
// to suppress this, everywhere else should boot for real.
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

export default app;
