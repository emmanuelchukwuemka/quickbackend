import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_6UVy5FwL_7XcANxgFM1cei2LXEGvJcki5');

export const sendEmail = async (to: string, subject: string, text: string) => {
  const { data, error } = await resend.emails.send({
    from: 'QuickDrop <onboarding@resend.dev>',
    to,
    subject,
    text,
  });

  if (error) {
    console.error('[mailer] Resend error:', error);
    throw new Error(error.message);
  }

  console.log('[mailer] Sent via Resend:', data?.id);
  return data;
};
