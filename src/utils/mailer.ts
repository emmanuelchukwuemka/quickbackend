import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, text: string) => {
  const isMailConfigured = Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USERNAME &&
      process.env.MAIL_PASSWORD &&
      process.env.MAIL_FROM_ADDRESS &&
      process.env.MAIL_FROM_NAME,
  );

  if (!isMailConfigured) {
    const message = 'Email service is not configured. Please set MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, and MAIL_FROM_NAME.';
    console.error(message);
    throw new Error(message);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 465,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
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
