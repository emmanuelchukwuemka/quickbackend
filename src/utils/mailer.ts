import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'nwekee125@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'xyuxmucbxvpzynxm';

export const sendEmail = async (to: string, subject: string, text: string) => {
  // Try port 465 (SSL) first, then fall back to 587 (STARTTLS)
  const configs = [
    { port: 465, secure: true },
    { port: 587, secure: false },
  ];

  let lastError: any;

  for (const cfg of configs) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: cfg.port,
        secure: cfg.secure,
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      const info = await transporter.sendMail({
        from: `"QuickDrop" <${GMAIL_USER}>`,
        to,
        subject,
        text,
      });

      console.log(`[mailer] Sent via port ${cfg.port}: ${info.messageId}`);
      return info;
    } catch (err: any) {
      console.error(`[mailer] Port ${cfg.port} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError;
};
