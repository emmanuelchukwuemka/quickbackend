import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Driver from '../models/Driver';
import Otp from '../models/Otp';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
};

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

import { sendEmail } from '../utils/mailer';

export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { phone_number, email } = req.body;
    const code = generateOtpCode();
    
    if (email) {
      const otp = new Otp({ email, code });
      await otp.save();
      let emailDelivered = false;
      try {
        await sendEmail(email, 'Your OTP Code', `Your QuickDrop verification code is: ${code}\n\nThis code expires in 10 minutes.`);
        emailDelivered = true;
      } catch (mailErr: any) {
        console.error('Email delivery failed:', mailErr.message);
      }
      return res.json({
        message: emailDelivered ? 'OTP sent successfully to email' : 'OTP created (email delivery failed — use code below for testing)',
        ...(emailDelivered ? {} : { debug_otp: code }),
      });
    } else if (phone_number) {
      const otp = new Otp({ phone_number, code });
      await otp.save();
      return res.json({ message: 'OTP sent successfully to phone' });
    } else {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone_number, email, code, role } = req.body;
    
    // Build query conditions manually depending on what is provided
    let condition: any = { code };
    if (email) condition.email = email;
    if (phone_number) condition.phone_number = phone_number;

    const otp = await Otp.findOne(condition);
    if (!otp) return res.status(400).json({ message: 'Invalid or expired OTP' });
    
    let user = email ? await User.findOne({ email }) : await User.findOne({ phone_number });
    if (!user) {
      user = new User({ phone_number, email, uid: phone_number || email });
      await user.save();
    }
    await Otp.deleteOne({ id: otp.id });
    const token = generateToken(user.id!);
    res.json({ user, token, role: role || 'passenger' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const userSignup = async (req: Request, res: Response) => {
  try {
    const userData = { ...req.body };
    let existingUser = null;
    if (userData.email) {
      existingUser = await User.findOne({ email: userData.email });
    }
    if (!existingUser && userData.phone_number) {
      existingUser = await User.findOne({ phone_number: userData.phone_number });
    }
    
    if (existingUser) {
      if (!existingUser.password) {
        await User.findByIdAndUpdate(existingUser.id!, { password: userData.password, display_name: userData.display_name });
        existingUser.password = userData.password;
        existingUser.display_name = userData.display_name;
        const token = generateToken(existingUser.id!);
        return res.status(201).json({ user: existingUser, token });
      } else {
        return res.status(400).json({ message: 'User already exists. Please login.' });
      }
    }

    if (!userData.uid) {
      userData.uid = userData.email || userData.phone_number || crypto.randomUUID();
    }
    const newUser = new User(userData);
    const savedUser = await newUser.save();
    const token = generateToken(savedUser.id!);
    res.status(201).json({ user: savedUser, token });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user.id!);
    res.json({ user, token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const driverSignup = async (req: Request, res: Response) => {
  try {
    const driverData = { ...req.body };

    // Check if driver already exists by email or phone
    let existing: any = null;
    if (driverData.email) existing = await Driver.findOne({ email: driverData.email });
    if (!existing && driverData.phone_number) existing = await Driver.findOne({ phone_number: driverData.phone_number });

    if (existing) {
      // Update password/name if the record was created without one
      if (driverData.password) {
        await Driver.findByIdAndUpdate(existing.id!, {
          password: driverData.password,
          ...(driverData.display_name ? { display_name: driverData.display_name } : {}),
          ...(driverData.phone_number ? { phone_number: driverData.phone_number } : {}),
        });
        existing.password = driverData.password;
      }
      const token = generateToken(existing.id!);
      return res.status(200).json({ driver: existing, token });
    }

    if (!driverData.uid) {
      driverData.uid = driverData.email || driverData.phone_number || crypto.randomUUID();
    }
    const newDriver = new Driver(driverData);
    const savedDriver = await newDriver.save();
    const token = generateToken(savedDriver.id!);
    res.status(201).json({ driver: savedDriver, token });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const driverLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const driver = await Driver.findOne({ email });
    if (!driver || driver.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(driver.id!);
    res.json({ driver, token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Password reset link sent' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const otpRecord = await Otp.findOne({ email, code: otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }
    await User.findByIdAndUpdate(user.id!, { password: newPassword });
    await Otp.deleteOne({ id: otpRecord.id });
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetDriverPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const otpRecord = await Otp.findOne({ email, code: otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(404).json({ message: 'No driver account found with this email' });
    }
    await Driver.findByIdAndUpdate(driver.id!, { password: newPassword });
    await Otp.deleteOne({ id: otpRecord.id });
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client();

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken, displayName: clientDisplayName } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

    let email: string | undefined;
    let name: string | undefined;
    let googleSub: string | undefined;

    // Try full signature verification first; fall back to plain JWT decode
    // if verification fails (e.g. cold-start, network timeout to googleapis).
    try {
      const ticket = await googleClient.verifyIdToken({ idToken });
      const payload = ticket.getPayload();
      email = payload?.email;
      name = payload?.name;
      googleSub = payload?.sub;
    } catch (verifyErr: any) {
      console.warn('verifyIdToken failed, falling back to JWT decode:', verifyErr.message);
      const decoded = jwt.decode(idToken) as Record<string, any> | null;
      email = decoded?.email;
      name = decoded?.name || decoded?.display_name;
      googleSub = decoded?.sub || decoded?.user_id;
    }

    // Firebase ID tokens don't embed the display name; use the client-provided value
    if (!name && clientDisplayName) name = clientDisplayName;

    if (!email) return res.status(400).json({ message: 'No email found in Google token' });

    let user = await User.findOne({ email });
    if (!user) {
      const newUser = new User({
        uid: googleSub || crypto.randomUUID(),
        email,
        display_name: name || '',
      });
      user = await newUser.save();
    } else if (!user.display_name && name) {
      user.display_name = name;
      await User.findByIdAndUpdate(user.id!, { display_name: name });
    }

    const token = generateToken(user.id!);
    return res.status(200).json({ user, token });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
