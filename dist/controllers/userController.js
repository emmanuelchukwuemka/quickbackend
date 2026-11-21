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
exports.saveFcmToken = exports.deleteOwnAccount = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.find();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const newUser = new User_1.default(req.body);
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;
        // Do not allow updating sensitive fields directly here — this route has
        // no auth, so wallet balance, trip count, and active/suspended status
        // must only ever change via dedicated, admin-gated endpoints.
        delete updates.wallet_balance;
        delete updates.numbe_trips;
        delete updates.is_active;
        const updatedUser = await User_1.default.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateUser = updateUser;
// Anonymizes the caller's own account rather than deleting the row outright
// — ride records reference passenger_ref by id, and hard-deleting would
// blank out the driver's own trip history for every ride this passenger
// ever took. is_active=false blocks every login path (see authController),
// so the account is permanently inaccessible even though the row remains.
const deleteOwnAccount = async (req, res) => {
    try {
        const id = req.user.id;
        const user = await User_1.default.findById(id);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        await User_1.default.findByIdAndUpdate(id, {
            display_name: 'Deleted User',
            email: `deleted-${crypto_1.default.randomUUID()}@quickdrop.ng`,
            phone_number: '',
            photo_url: '',
            password: crypto_1.default.randomUUID(),
            is_active: false,
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
        const { user_uid, fcm_token } = req.body;
        if (!user_uid || !fcm_token) {
            return res.status(400).json({ message: 'user_uid and fcm_token are required' });
        }
        const { query } = await Promise.resolve().then(() => __importStar(require('../db')));
        // The app sends whichever id it has on hand (numeric id after most
        // login paths, string uid elsewhere) — match either, same as the
        // lookups in socketManager.ts, or this silently updates 0 rows.
        await query(`UPDATE users SET fcm_token = $1 WHERE uid = $2 OR id::text = $2`, [fcm_token, user_uid]);
        res.json({ message: 'FCM token saved' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.saveFcmToken = saveFcmToken;
