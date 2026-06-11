import nodemailer from 'nodemailer';

const MAIL_HOST = process.env.MAIL_HOST || 'mail.myshop24.ng';
const MAIL_PORT = Number(process.env.MAIL_PORT) || 465;
const MAIL_USERNAME = process.env.MAIL_USERNAME || 'shop24@myshop24.ng';
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || 'shop24123..';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || 'shop24@myshop24.ng';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'QuickDrop';

export const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_PORT === 465,
    auth: {
      user: MAIL_USERNAME,
      pass: MAIL_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      text,
    });
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email: ', error);
    throw error;
  }
};
