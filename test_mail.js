require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 465,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

async function testMail() {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: 'nwekee125@gmail.com',
      subject: 'Test Mail',
      text: 'Test Mail',
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
  }
}

testMail();
