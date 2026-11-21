"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRideFare = exports.calculateDistanceKm = exports.normalizeRideType = void 0;
const FareSettings_1 = __importDefault(require("../models/FareSettings"));
const RIDE_TYPE_MULTIPLIER_KEY = {
    standard: 'standard_multiplier',
    comfort: 'premium_multiplier',
    premium: 'premium_multiplier',
    car: 'standard_multiplier',
    xl: 'xl_multiplier',
};
const normalizeRideType = (rideType) => (rideType || 'standard').toString().trim().toLowerCase();
exports.normalizeRideType = normalizeRideType;
const calculateDistanceKm = (pickupLat, pickupLng, dropoffLat, dropoffLng) => {
    const lat1 = Number(pickupLat) || 0;
    const lng1 = Number(pickupLng) || 0;
    const lat2 = Number(dropoffLat) || 0;
    const lng2 = Number(dropoffLng) || 0;
    if ((lat1 == 0 && lng1 == 0) || (lat2 == 0 && lng2 == 0)) {
        return 0;
    }
    const earthRadiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
exports.calculateDistanceKm = calculateDistanceKm;
// Reads live fare configuration from the admin-editable fare_settings row
// instead of hardcoded constants.
const calculateRideFare = async (distanceKm, rideType) => {
    const settings = await FareSettings_1.default.getSettings();
    const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0;
    const multiplierKey = RIDE_TYPE_MULTIPLIER_KEY[(0, exports.normalizeRideType)(rideType)] ?? 'standard_multiplier';
    const multiplier = settings[multiplierKey];
    const total = (settings.base_fare + safeDistance * settings.price_per_km) * multiplier;
    return Number(total.toFixed(2));
};
exports.calculateRideFare = calculateRideFare;
