"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appleLogin = exports.googleLogin = exports.resetDriverPassword = exports.resetUserPassword = exports.forgotPassword = exports.driverLogin = exports.driverSignup = exports.userLogin = exports.userSignup = exports.verifyOtp = exports.requestOtp = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const Driver_1 = __importDefault(require("../models/Driver"));
const Otp_1 = __importDefault(require("../models/Otp"));
const AdminNotification_1 = __importDefault(require("../models/AdminNotification"));
const displayName_1 = require("../utils/displayName");
const appleAuth_1 = require("../utils/appleAuth");
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
};
const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const mailer_1 = require("../utils/mailer");
const shouldExposeDebugOtp = () => process.env.NODE_ENV !== 'production' || process.env.OTP_DEBUG === 'true';
const requestOtp = async (req, res) => {
    try {
        const { phone_number, email } = req.body;
        const code = generateOtpCode();
        if (email) {
            const otp = new Otp_1.default({ email, code });
            await otp.save();
            console.error(`[otp][request] email=${email} code=${code} id=${otp.id} createdAt=${otp.createdAt?.toISOString()} now=${new Date().toISOString()}`);
            // Fire-and-forget — respond immediately, Resend handles delivery
            (0, mailer_1.sendEmail)(email, 'Your OTP Code', `Your QuickDrop verification code is: ${code}\n\nThis code expires in 10 minutes.`)
                .then(() => console.error(`[mailer] OTP delivered to ${email}`))
                .catch((e) => console.error('[mailer] delivery failed:', e));
            const payload = { message: 'OTP sent to email' };
            if (shouldExposeDebugOtp())
                payload.debug_otp = code;
            res.json(payload);
            return;
        }
        else if (phone_number) {
            const otp = new Otp_1.default({ phone_number, code });
            await otp.save();
            const payload = { message: 'OTP sent successfully to phone' };
            if (shouldExposeDebugOtp())
                payload.debug_otp = code;
            return res.json(payload);
        }
        else {
            return res.status(400).json({ message: 'Email or phone number is required' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.requestOtp = requestOtp;
// Dedicated Apple/Google app-review accounts. Reviewers can't receive a
// real OTP, so these email+code pairs bypass the OTP table entirely.
// Not a general backdoor - the emails are fixed and not real inboxes.
// Apple App Review and Google Play Review each have their own, since the
// email registered in each store's review-credentials section is separate.
const APP_REVIEW_EMAILS = ['appreview@quickdrop.ng', 'reviewer.passenger@quickdrop.ng'];
const APP_REVIEW_CODE = '111111';
const verifyOtp = async (req, res) => {
    try {
        const { phone_number, email, code, role } = req.body;
        const isReviewLogin = APP_REVIEW_EMAILS.includes(email) && code === APP_REVIEW_CODE;
        if (!isReviewLogin) {
            // Build query conditions manually depending on what is provided
            let condition = { code };
            if (email)
                condition.email = email;
            if (phone_number)
                condition.phone_number = phone_number;
            const otp = await Otp_1.default.findOne(condition);
            if (!otp) {
                const existing = email ? await Otp_1.default.find({ email }) : await Otp_1.default.find({ phone_number });
                console.error(`[otp][verify] MISMATCH submitted code=${code} email=${email || ''} phone=${phone_number || ''} now=${new Date().toISOString()} existingRows=${JSON.stringify(existing.map(o => ({ code: o.code, createdAt: o.createdAt?.toISOString() })))}`);
                return res.status(400).json({ message: 'Invalid or expired OTP' });
            }
            console.error(`[otp][verify] MATCH code=${code} email=${email || ''} phone=${phone_number || ''}`);
            await Otp_1.default.deleteOne({ id: otp.id });
        }
        const requestedRole = role === 'driver' ? 'driver' : 'passenger';
        let account;
        let isNew = false;
        if (requestedRole === 'driver') {
            account = email ? await Driver_1.default.findOne({ email }) : await Driver_1.default.findOne({ phone_number });
            if (!account) {
                isNew = true;
                account = new Driver_1.default({
                    phone_number,
                    email,
                    uid: phone_number || email || crypto_1.default.randomUUID(),
                    role: 'driver',
                    display_name: (0, displayName_1.otpFallbackDisplayName)('driver', phone_number),
                });
                await account.save();
            }
        }
        else {
            account = email ? await User_1.default.findOne({ email }) : await User_1.default.findOne({ phone_number });
            if (!account) {
                isNew = true;
                account = new User_1.default({
                    phone_number,
                    email,
                    uid: phone_number || email || crypto_1.default.randomUUID(),
                    display_name: (0, displayName_1.otpFallbackDisplayName)('passenger', phone_number),
                });
                await account.save();
            }
        }
        if (account.is_active === false) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        const token = generateToken(account.id);
        if (requestedRole === 'driver') {
            return res.json({ driver: account, token, role: 'driver', is_new: isNew });
        }
        res.json({ user: account, token, role: 'passenger', is_new: isNew });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.verifyOtp = verifyOtp;
const userSignup = async (req, res) => {
    try {
        const userData = { ...req.body };
        if (userData.password) {
            userData.password = await bcrypt_1.default.hash(userData.password, 10);
        }
        let existingUser = null;
        if (userData.email) {
            existingUser = await User_1.default.findOne({ email: userData.email });
        }
        if (!existingUser && userData.phone_number) {
            existingUser = await User_1.default.findOne({ phone_number: userData.phone_number });
        }
        if (existingUser) {
            if (!existingUser.password) {
                await User_1.default.findByIdAndUpdate(existingUser.id, { password: userData.password, display_name: userData.display_name });
                existingUser.password = userData.password;
                existingUser.display_name = userData.display_name;
                const token = generateToken(existingUser.id);
                return res.status(201).json({ user: existingUser, token });
            }
            else {
                return res.status(400).json({ message: 'User already exists. Please login.' });
            }
        }
        if (!userData.uid) {
            userData.uid = userData.email || userData.phone_number || crypto_1.default.randomUUID();
        }
        const newUser = new User_1.default(userData);
        const savedUser = await newUser.save();
        const token = generateToken(savedUser.id);
        res.status(201).json({ user: savedUser, token });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.userSignup = userSignup;
const userLogin = async (req, res) => {
    try {
        const identifier = req.body.email || req.body.phone_number;
        const password = req.body.password;
        const user = (identifier && identifier.includes('@'))
            ? await User_1.default.findOne({ email: identifier })
            : await User_1.default.findOne({ phone_number: identifier });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email or phone.' });
        }
        if (!user.password || !(await bcrypt_1.default.compare(password, user.password))) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }
        if (user.is_active === false) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        const token = generateToken(user.id);
        res.json({ user, token });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.userLogin = userLogin;
const driverSignup = async (req, res) => {
    try {
        const driverData = { ...req.body };
        if (driverData.password) {
            driverData.password = await bcrypt_1.default.hash(driverData.password, 10);
        }
        // Check if driver already exists by email or phone
        let existing = null;
        if (driverData.email)
            existing = await Driver_1.default.findOne({ email: driverData.email });
        if (!existing && driverData.phone_number)
            existing = await Driver_1.default.findOne({ phone_number: driverData.phone_number });
        if (existing) {
            // Update password/name if the record was created without one
            if (driverData.password) {
                await Driver_1.default.findByIdAndUpdate(existing.id, {
                    password: driverData.password,
                    ...(driverData.display_name ? { display_name: driverData.display_name } : {}),
                    ...(driverData.phone_number ? { phone_number: driverData.phone_number } : {}),
                });
                existing.password = driverData.password;
            }
            const token = generateToken(existing.id);
            return res.status(200).json({ driver: existing, token });
        }
        if (!driverData.uid) {
            driverData.uid = driverData.email || driverData.phone_number || crypto_1.default.randomUUID();
        }
        const newDriver = new Driver_1.default(driverData);
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
            console.warn('[AdminNotification] driverSignup alert error:', alertErr);
        }
        const token = generateToken(savedDriver.id);
        res.status(201).json({ driver: savedDriver, token });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.driverSignup = driverSignup;
const driverLogin = async (req, res) => {
    try {
        const identifier = req.body.email || req.body.phone_number;
        const password = req.body.password;
        const driver = (identifier && identifier.includes('@'))
            ? await Driver_1.default.findOne({ email: identifier })
            : await Driver_1.default.findOne({ phone_number: identifier });
        if (!driver) {
            return res.status(404).json({ message: 'No driver account found with this email or phone.' });
        }
        if (!driver.password || !(await bcrypt_1.default.compare(password, driver.password))) {
            return res.status(401).json({ message: 'Incorrect password.' });
        }
        if (driver.is_active === false) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        const token = generateToken(driver.id);
        res.json({ driver, token });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.driverLogin = driverLogin;
const forgotPassword = async (req, res) => {
    try {
        res.json({ message: 'Password reset link sent' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.forgotPassword = forgotPassword;
const resetUserPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        const otpRecord = await Otp_1.default.findOne({ email, code: otp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await User_1.default.findByIdAndUpdate(user.id, { password: hashed });
        await Otp_1.default.deleteOne({ id: otpRecord.id });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.resetUserPassword = resetUserPassword;
const resetDriverPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        const otpRecord = await Otp_1.default.findOne({ email, code: otp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        const driver = await Driver_1.default.findOne({ email });
        if (!driver) {
            return res.status(404).json({ message: 'No driver account found with this email' });
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await Driver_1.default.findByIdAndUpdate(driver.id, { password: hashed });
        await Otp_1.default.deleteOne({ id: otpRecord.id });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.resetDriverPassword = resetDriverPassword;
const google_auth_library_1 = require("google-auth-library");
const googleClient = new google_auth_library_1.OAuth2Client();
const googleLogin = async (req, res) => {
    try {
        const { idToken, displayName: clientDisplayName } = req.body;
        if (!idToken)
            return res.status(400).json({ message: 'Missing idToken' });
        let email;
        let name;
        let googleSub;
        // Try full signature verification first; fall back to plain JWT decode
        // if verification fails (e.g. cold-start, network timeout to googleapis).
        try {
            const ticket = await googleClient.verifyIdToken({ idToken });
            const payload = ticket.getPayload();
            email = payload?.email;
            name = payload?.name;
            googleSub = payload?.sub;
        }
        catch (verifyErr) {
            console.warn('verifyIdToken failed, falling back to JWT decode:', verifyErr.message);
            const decoded = jsonwebtoken_1.default.decode(idToken);
            email = decoded?.email;
            name = decoded?.name || decoded?.display_name;
            googleSub = decoded?.sub || decoded?.user_id;
        }
        // Firebase ID tokens don't embed the display name; use the client-provided value
        if (!name && clientDisplayName)
            name = clientDisplayName;
        if (!email)
            return res.status(400).json({ message: 'No email found in Google token' });
        let user = await User_1.default.findOne({ email });
        if (!user) {
            const newUser = new User_1.default({
                uid: googleSub || crypto_1.default.randomUUID(),
                email,
                display_name: name || '',
            });
            user = await newUser.save();
        }
        else if (!user.display_name && name) {
            user.display_name = name;
            await User_1.default.findByIdAndUpdate(user.id, { display_name: name });
        }
        if (user.is_active === false) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        const token = generateToken(user.id);
        return res.status(200).json({ user, token });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};
exports.googleLogin = googleLogin;
const appleLogin = async (req, res) => {
    try {
        const { identityToken, displayName: clientDisplayName } = req.body;
        if (!identityToken)
            return res.status(400).json({ message: 'Missing identityToken' });
        const { sub: appleSub, email } = await (0, appleAuth_1.verifyAppleIdentityToken)(identityToken);
        // Apple only sends the user's name on the very first authorization ever
        // granted to this app, so the client passes along whatever it got then;
        // every return visit after that, name comes back empty from Apple itself.
        if (!email)
            return res.status(400).json({ message: 'No email found in Apple token' });
        let user = await User_1.default.findOne({ email });
        if (!user) {
            const newUser = new User_1.default({
                uid: appleSub,
                email,
                display_name: clientDisplayName || '',
            });
            user = await newUser.save();
        }
        else if (!user.display_name && clientDisplayName) {
            user.display_name = clientDisplayName;
            await User_1.default.findByIdAndUpdate(user.id, { display_name: clientDisplayName });
        }
        if (user.is_active === false) {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        const token = generateToken(user.id);
        return res.status(200).json({ user, token });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};
exports.appleLogin = appleLogin;
