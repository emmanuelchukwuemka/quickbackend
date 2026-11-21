"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateComplaint = exports.listComplaints = exports.fileComplaint = void 0;
const Complaint_1 = __importDefault(require("../models/Complaint"));
// Public — lets the rider/driver app file a complaint once it adds that flow.
const fileComplaint = async (req, res) => {
    try {
        const { user_ref, user_role, subject, message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'A message is required.' });
        }
        const complaint = new Complaint_1.default({ user_ref, user_role, subject, message });
        await complaint.save();
        res.status(201).json(complaint);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.fileComplaint = fileComplaint;
const listComplaints = async (_req, res) => {
    try {
        const complaints = await Complaint_1.default.find();
        res.json(complaints);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listComplaints = listComplaints;
const updateComplaint = async (req, res) => {
    try {
        const { status, admin_notes } = req.body;
        const updates = {};
        if (status !== undefined) {
            updates.status = status;
            if (status === 'resolved')
                updates.resolved_at = new Date();
        }
        if (admin_notes !== undefined)
            updates.admin_notes = admin_notes;
        const complaint = await Complaint_1.default.findByIdAndUpdate(req.params.id, updates);
        if (!complaint)
            return res.status(404).json({ message: 'Complaint not found.' });
        res.json(complaint);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateComplaint = updateComplaint;
