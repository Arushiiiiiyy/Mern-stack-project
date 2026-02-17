import nodemailer from 'nodemailer';

// Create transporter - uses environment variables or defaults to ethereal for dev
let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Production: use configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Dev: use Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
  return transporter;
};

/**
 * Send a registration confirmation email
 */
export const sendRegistrationEmail = async ({ to, participantName, eventName, ticketID, venue, startDate, type }) => {
  try {
    const transport = await getTransporter();

    const dateStr = new Date(startDate).toLocaleString('en-IN', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
    });

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0c; color: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #3b82f6, #6d28d9); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Felicity 2026</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Registration Confirmed!</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #ccc; font-size: 16px;">Hi <strong style="color: #fff;">${participantName}</strong>,</p>
          <p style="color: #aaa; line-height: 1.6;">
            ${type === 'Merchandise' 
              ? 'Your merchandise order has been placed! Once your payment is verified, you will receive your ticket.'
              : `You have been successfully registered for <strong style="color: #3b82f6;">${eventName}</strong>.`}
          </p>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; color: #ccc; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #888;">Ticket ID</td><td style="padding: 6px 0; font-weight: 700; color: #3b82f6;">${ticketID}</td></tr>
              <tr><td style="padding: 6px 0; color: #888;">Event</td><td style="padding: 6px 0;">${eventName}</td></tr>
              <tr><td style="padding: 6px 0; color: #888;">Venue</td><td style="padding: 6px 0;">${venue}</td></tr>
              <tr><td style="padding: 6px 0; color: #888;">Date</td><td style="padding: 6px 0;">${dateStr}</td></tr>
            </table>
          </div>
          <p style="color: #888; font-size: 13px;">Show your ticket QR code at the venue for entry. You can view it anytime in your dashboard.</p>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center;">
          <p style="color: #555; font-size: 12px; margin: 0;">IIIT Hyderabad &bull; Felicity 2026</p>
        </div>
      </div>
    `;

    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Felicity 2026" <noreply@felicity.iiit.ac.in>',
      to,
      subject: `Registration Confirmed: ${eventName} — ${ticketID}`,
      html
    });

    // In dev mode, log the preview URL
    if (!process.env.SMTP_HOST) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Email send failed:', error.message);
    // Don't throw — email failure shouldn't break registration
  }
};

/**
 * Send merchandise payment approved email with QR
 */
export const sendPaymentApprovedEmail = async ({ to, participantName, eventName, ticketID }) => {
  try {
    const transport = await getTransporter();

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0c; color: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Payment Approved!</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Felicity 2026</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #ccc;">Hi <strong style="color: #fff;">${participantName}</strong>,</p>
          <p style="color: #aaa; line-height: 1.6;">
            Your payment for <strong style="color: #22c55e;">${eventName}</strong> has been approved! Your ticket is now active.
          </p>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="color: #888; font-size: 13px; margin: 0 0 8px;">Your Ticket ID</p>
            <p style="color: #22c55e; font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0;">${ticketID}</p>
          </div>
          <p style="color: #888; font-size: 13px;">View your QR ticket in your dashboard.</p>
        </div>
      </div>
    `;

    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"Felicity 2026" <noreply@felicity.iiit.ac.in>',
      to,
      subject: `Payment Approved: ${eventName} — ${ticketID}`,
      html
    });

    if (!process.env.SMTP_HOST) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error('Email send failed:', error.message);
  }
};
