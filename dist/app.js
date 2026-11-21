"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
// Import Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
const rideRoutes_1 = __importDefault(require("./routes/rideRoutes"));
const scheduledRideRoutes_1 = __importDefault(require("./routes/scheduledRideRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const adminAuthRoutes_1 = __importDefault(require("./routes/adminAuthRoutes"));
const adminUserRoutes_1 = __importDefault(require("./routes/adminUserRoutes"));
const promoCodeRoutes_1 = __importDefault(require("./routes/promoCodeRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const fareSettingsRoutes_1 = __importDefault(require("./routes/fareSettingsRoutes"));
const adminAlertRoutes_1 = __importDefault(require("./routes/adminAlertRoutes"));
const paymentGatewayRoutes_1 = __importDefault(require("./routes/paymentGatewayRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const callRoutes_1 = __importDefault(require("./routes/callRoutes"));
const path_1 = __importDefault(require("path"));
const City_1 = __importDefault(require("./models/City"));
const RideOption_1 = __importDefault(require("./models/RideOption"));
const adminAuthController_1 = require("./controllers/adminAuthController");
const app = (0, express_1.default)();
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
    const cities = await City_1.default.find({});
    if (!cities.length) {
        await City_1.default.insertMany(defaultCities);
    }
    const rideOptions = await RideOption_1.default.find({});
    if (!rideOptions.length) {
        await RideOption_1.default.insertMany(defaultRideOptions);
    }
};
// Middleware
app.use((0, cors_1.default)());
// Stash the raw request body bytes alongside the parsed req.body — the
// Paystack webhook handler needs the exact raw bytes to verify its HMAC
// signature (re-serializing req.body would not byte-for-byte match what
// Paystack actually signed).
app.use(express_1.default.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express_1.default.urlencoded({ extended: true }));
// Serve the marketing landing page (static site built from ./landing via
// `npm run build` inside that folder) at the root domain. Only serves exact
// file matches (index.html for '/', plus its assets) — everything else
// (API routes, /admin) falls through untouched.
app.use(express_1.default.static(path_1.default.join(__dirname, '../landing/dist')));
// Serve static files (like uploaded images)
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Serve the admin dashboard (React SPA built from ./admin via `npm run build`
// inside that folder) at /admin. The fallback middleware handles client-side
// routes (e.g. /admin/drivers) that don't correspond to a static file.
const adminDistPath = path_1.default.join(__dirname, '../admin/dist');
app.use('/admin', express_1.default.static(adminDistPath));
app.use('/admin', (req, res) => {
    res.sendFile(path_1.default.join(adminDistPath, 'index.html'));
});
app.use((req, res, next) => {
    try {
        fs_1.default.appendFileSync('requests.log', `${new Date().toISOString()} ${req.method} ${req.url} ${JSON.stringify(req.body)}\n`);
    }
    catch (e) { }
    next();
});
// Basic Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Backend is running' });
});
// DB diagnostic — lists existing tables
app.get('/api/debug/tables', async (req, res) => {
    try {
        const { query } = await Promise.resolve().then(() => __importStar(require('./db')));
        const result = await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
        res.json({ tables: result.rows.map((r) => r.tablename) });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/drivers', driverRoutes_1.default);
app.use('/api/rides', rideRoutes_1.default);
app.use('/api/scheduled-rides', scheduledRideRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/payments/gateway', paymentGatewayRoutes_1.default);
// More specific /api/admin/* prefixes must be registered before the
// catch-all /api/admin mount below — adminRoutes applies its auth
// middleware to every request that enters it, including ones that don't
// match any of its own routes, so it would otherwise intercept and reject
// these before they ever reached their real handlers.
app.use('/api/admin/auth', adminAuthRoutes_1.default);
app.use('/api/admin/users', adminUserRoutes_1.default);
app.use('/api/admin/promo-codes', promoCodeRoutes_1.default);
app.use('/api/admin/notifications', notificationRoutes_1.default);
app.use('/api/admin/settings', settingsRoutes_1.default);
app.use('/api/admin/fare-settings', fareSettingsRoutes_1.default);
app.use('/api/admin/alerts', adminAlertRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/complaints', complaintRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/calls', callRoutes_1.default);
// Mock Data Replacement Routes
app.get('/api/cities', async (req, res) => {
    try {
        let cities = await City_1.default.find({});
        res.json(cities);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
app.get('/api/rideOptions', async (req, res) => {
    try {
        let options = await RideOption_1.default.find({});
        res.json(options);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socketManager_1 = require("./sockets/socketManager");
const scheduledRideDispatcher_1 = require("./utils/scheduledRideDispatcher");
const scheduledRideReminders_1 = require("./utils/scheduledRideReminders");
const paymentReconciler_1 = require("./utils/paymentReconciler");
const PORT = process.env.PORT || 5000;
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
    }
});
(0, socketManager_1.initSockets)(io);
const connectDB = async () => {
    try {
        console.log('[startup] connecting to database...');
        await (0, db_1.initDb)();
        console.log('[startup] initDb complete, seeding reference data...');
        await ensureReferenceData();
        await (0, adminAuthController_1.seedDefaultAdmin)();
        console.log('[startup] reference data ready');
        console.log('Connected to database');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            // Run immediately to catch any rides that became due while server was down
            setTimeout(scheduledRideDispatcher_1.dispatchScheduledRides, 5000);
            setTimeout(scheduledRideReminders_1.sendScheduledRideReminders, 8000);
            setTimeout(paymentReconciler_1.reconcilePendingPayments, 10000);
            // Then check every 60 seconds
            setInterval(scheduledRideDispatcher_1.dispatchScheduledRides, 60 * 1000);
            setInterval(scheduledRideReminders_1.sendScheduledRideReminders, 60 * 1000);
            setInterval(paymentReconciler_1.reconcilePendingPayments, 2 * 60 * 1000);
            console.log('[Scheduler] Scheduled ride dispatcher, reminders, and payment reconciliation checks started');
        });
    }
    catch (err) {
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
exports.default = app;
