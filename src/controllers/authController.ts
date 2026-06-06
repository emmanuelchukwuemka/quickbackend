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
      await sendEmail(email, 'Your OTP Code', `Your login OTP code is ${code}`);
      return res.json({ message: 'OTP sent successfully to email' });
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
