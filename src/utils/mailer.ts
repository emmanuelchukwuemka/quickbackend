import nodemailer from 'nodemailer';

const MAIL_USERNAME = process.env.MAIL_USERNAME || 'nwekee125@gmail.com';
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || 'xyuxmucbxvpzynxm';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'QuickDrop';

export const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: MAIL_USERNAME,
      pass: MAIL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"${MAIL_FROM_NAME}" <${MAIL_USERNAME}>`,
    to,
    subject,
    text,
  });
  console.log('Message sent: %s', info.messageId);
  return info;
};
