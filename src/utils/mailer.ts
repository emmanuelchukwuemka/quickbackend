import nodemailer from 'nodemailer';

interface SmtpCfg {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

// Build priority list: env-var SMTP first (set in render.yaml), then Gmail fallback
const smtpCandidates: SmtpCfg[] = [];

if (process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD) {
  smtpCandidates.push({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '465', 10),
    secure: (process.env.MAIL_PORT || '465') !== '587',
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  });
}

// Gmail working credentials — fallback when env vars not set or env SMTP fails
const GMAIL_USER = process.env.GMAIL_USER || 'mycribafrica@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'evwp gdfh ging lbph';
smtpCandidates.push(
  { host: 'smtp.gmail.com', port: 587, secure: false, user: GMAIL_USER, pass: GMAIL_PASS },
  { host: 'smtp.gmail.com', port: 465, secure: true,  user: GMAIL_USER, pass: GMAIL_PASS },
);

export const sendEmail = async (to: string, subject: string, text: string) => {
  let lastError: any;

  for (const cfg of smtpCandidates) {
    try {
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      const info = await transporter.sendMail({
        from: `"QuickDrop" <${cfg.user}>`,
        to,
        subject,
        text,
      });

      console.log(`[mailer] Sent via ${cfg.host}:${cfg.port} → ${info.messageId}`);
      return info;
    } catch (err: any) {
      console.error(`[mailer] ${cfg.host}:${cfg.port} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError;
};
