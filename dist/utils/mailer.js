"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.MAIL_HOST || 'mail.quickdrop.ng',
    port: Number(process.env.MAIL_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USERNAME || 'quickdrop@quickdrop.ng',
        pass: process.env.MAIL_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
});
const sendEmail = async (to, subject, text) => {
    const from = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME || 'quickdrop@quickdrop.ng';
    const fromName = process.env.MAIL_FROM_NAME || 'QuickDrop';
    console.error(`[mailer] connecting to ${process.env.MAIL_HOST || 'mail.quickdrop.ng'}:${process.env.MAIL_PORT || 465} to send to ${to}...`);
    const info = await transporter.sendMail({
        from: `${fromName} <${from}>`,
        to,
        subject,
        text,
    });
    console.error('[mailer] Sent via SMTP:', info.messageId);
    return info;
};
exports.sendEmail = sendEmail;
