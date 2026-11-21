"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFcmToken = exports.deleteOwnAccount = exports.deleteDriver = exports.uploadDocuments = exports.updateDriver = exports.createDriver = exports.getDriverById = exports.getAllDrivers = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Driver_1 = __importDefault(require("../models/Driver"));
const AdminNotification_1 = __importDefault(require("../models/AdminNotification"));
const db_1 = require("../db");
const getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver_1.default.find();
        res.json(drivers);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllDrivers = getAllDrivers;
const getDriverById = async (req, res) => {
    try {
        const driver = await Driver_1.default.findById(req.params.id);
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        res.json(driver);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDriverById = getDriverById;
const createDriver = async (req, res) => {
    try {
        const newDriver = new Driver_1.default(req.body);
        const savedDriver = await newDriver.save();
        try {
            await new AdminNotification_1.default({
                type: 'driver_application',
                title: 'New Driver Application',
                message: `${savedDriver.display_name || 'A new driver'} submitted an application and is awaiting review.`,
                related_type: 'driver',
                related_id: savedDriver.id,
            }).save();
        }
        catch (alertErr) {
            console.warn('[AdminNotification] createDriver alert error:', alertErr);
        }
        res.status(201).json(savedDriver);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createDriver = createDriver;
const updateDriver = async (req, res) => {
    try {
        const id = req.params.id;
        // wallet_balance, verification_status, and is_active must only ever
        // change via the dedicated wallet/approval/suspend admin endpoints —
        // this generic update route has no auth, so it can't be trusted with
        // them.
        const { wallet_balance, verification_status, is_active, ...updates } = req.body;
        // Nothing left to set (e.g. caller sent only the stripped fields) — treat
        // as a no-op rather than letting findByIdAndUpdate's "no SET clause"
        // short-circuit read as a false "Driver not found".
        const updatedDriver = Object.keys(updates).length
            ? await Driver_1.default.findByIdAndUpdate(id, updates, { new: true })
            : await Driver_1.default.findById(id);
        if (!updatedDriver)
            return res.status(404).json({ message: 'Driver not found' });
        res.json(updatedDriver);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateDriver = updateDriver;
const uploadDocuments = async (req, res) => {
    try {
        const id = req.params.id;
        const newDocuments = req.body.documents || []; // Array of documents
        // Fetch existing driver to get current documents
        const existingDriver = await Driver_1.default.findById(id);
        if (!existingDriver)
            return res.status(404).json({ message: 'Driver not found' });
        const currentDocuments = Array.isArray(existingDriver.documents) ? existingDriver.documents : [];
        const updatedDocuments = [...currentDocuments, ...newDocuments];
        // Save updated documents array as JSON string
        const driver = await Driver_1.default.findByIdAndUpdate(id, { documents: JSON.stringify(updatedDocuments) }, { new: true });
        res.json({ message: 'Documents uploaded', driver });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadDocuments = uploadDocuments;
const deleteDriver = async (req, res) => {
    try {
        const id = req.params.id;
        const driver = await Driver_1.default.findById(id);
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        await Driver_1.default.deleteOne({ id });
        res.json({ message: 'Driver deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteDriver = deleteDriver;
// Anonymizes the caller's own account rather than deleting the row outright
// — ride records reference driver_ref by id, and hard-deleting would blank
// out passengers' own trip history for every ride this driver ever gave.
// is_active=false blocks every login path (see authController), so the
// account is permanently inaccessible even though the row remains.
const deleteOwnAccount = async (req, res) => {
    try {
        const id = req.user.id;
        const driver = await Driver_1.default.findById(id);
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        await Driver_1.default.findByIdAndUpdate(id, {
            display_name: 'Deleted User',
            email: `deleted-${crypto_1.default.randomUUID()}@quickdrop.ng`,
            phone_number: '',
            photo_url: '',
            password: crypto_1.default.randomUUID(),
            is_active: false,
            documents: null,
            residential_address: '',
            nin: '',
            license_number: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
        });
        res.json({ message: 'Account deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteOwnAccount = deleteOwnAccount;
const saveFcmToken = async (req, res) => {
    try {
        const { driver_uid, fcm_token } = req.body;
        if (!driver_uid || !fcm_token) {
            return res.status(400).json({ message: 'driver_uid and fcm_token are required' });
        }
        // Same id/uid mismatch as saveFcmToken in userController.ts — the app
        // sends whichever id it has on hand, so match either or this silently
        // updates 0 rows.
        await (0, db_1.query)(`UPDATE drivers SET fcm_token = $1 WHERE uid = $2 OR id::text = $2`, [fcm_token, driver_uid]);
        res.json({ message: 'FCM token saved' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.saveFcmToken = saveFcmToken;
