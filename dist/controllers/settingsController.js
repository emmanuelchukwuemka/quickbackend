"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCity = exports.createCity = exports.deleteRideOption = exports.updateRideOption = exports.createRideOption = void 0;
const RideOption_1 = __importDefault(require("../models/RideOption"));
const City_1 = __importDefault(require("../models/City"));
const createRideOption = async (req, res) => {
    try {
        const { Type, price, features, numbersofseats } = req.body;
        if (!Type)
            return res.status(400).json({ message: 'Type is required.' });
        const option = new RideOption_1.default({ Type, price, features, numbersofseats });
        await option.save();
        res.status(201).json(option);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createRideOption = createRideOption;
const updateRideOption = async (req, res) => {
    try {
        const { price, features, numbersofseats } = req.body;
        const updates = {};
        if (price !== undefined)
            updates.price = price;
        if (features !== undefined)
            updates.features = features;
        if (numbersofseats !== undefined)
            updates.numbersofseats = numbersofseats;
        const option = await RideOption_1.default.findByIdAndUpdate(req.params.id, updates);
        if (!option)
            return res.status(404).json({ message: 'Ride option not found.' });
        res.json(option);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateRideOption = updateRideOption;
const deleteRideOption = async (req, res) => {
    try {
        await RideOption_1.default.deleteOne({ id: req.params.id });
        res.json({ message: 'Ride option deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteRideOption = deleteRideOption;
const createCity = async (req, res) => {
    try {
        const { location_name, lat, lng } = req.body;
        if (!location_name)
            return res.status(400).json({ message: 'location_name is required.' });
        const city = new City_1.default({ location_name, Latlng: { lat: Number(lat) || 0, lng: Number(lng) || 0 } });
        await city.save();
        res.status(201).json(city);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCity = createCity;
const deleteCity = async (req, res) => {
    try {
        await City_1.default.deleteOne({ id: req.params.id });
        res.json({ message: 'City deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteCity = deleteCity;
