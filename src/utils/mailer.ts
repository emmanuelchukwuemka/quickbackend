import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
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

export const sendEmail = async (to: string, subject: string, text: string) => {
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
