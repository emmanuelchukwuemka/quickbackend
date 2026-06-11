import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'nwekee125@gmail.com',
    pass: 'xyuxmucbxvpzynxm',
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  const info = await transporter.sendMail({
    from: '"QuickDrop" <nwekee125@gmail.com>',
    to,
    subject,
    text,
  });
  console.log('Message sent: %s', info.messageId);
  return info;
};
