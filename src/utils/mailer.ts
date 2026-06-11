import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'nwekee125@gmail.com',
      pass: 'xyuxmucbxvpzynxm',
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  const info = await transporter.sendMail({
    from: '"QuickDrop" <nwekee125@gmail.com>',
    to,
    subject,
    text,
  });
  console.log('Message sent: %s', info.messageId);
  return info;
};
