import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Driver from '../models/Driver';
import Otp from '../models/Otp';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
};

export const requestOtp = async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;
    const code = "1234"; // mock OTP
    const otp = new Otp({ phone_number, code });
    await otp.save();
    res.json({ message: 'OTP sent' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone_number, code } = req.body;
    const otp = await Otp.findOne({ phone_number, code });
    if (!otp) return res.status(400).json({ message: 'Invalid OTP' });
    
    let user = await User.findOne({ phone_number });
    if (!user) {
      user = new User({ phone_number, uid: phone_number });
      await user.save();
    }
    const token = generateToken(user.id!);
    res.json({ user, token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const driverSignup = async (req: Request, res: Response) => {
  try {
    const newDriver = new Driver(req.body);
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
