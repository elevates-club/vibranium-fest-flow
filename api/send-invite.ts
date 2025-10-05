import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, role, firstName } = req.body || {};
  if (!email || !role) {
    return res.status(400).json({ success: false, error: 'Missing email or role' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${baseUrl}/auth?invite=1&role=${encodeURIComponent(role)}&email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;background:#111827;color:#e5e7eb;border:1px solid #333;border-radius:10px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,hsl(270,91%,65%),hsl(220,91%,60%));padding:20px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:24px;">Vibranium 5.0</h1>
          <p style="margin:4px 0 0;">You are invited as <strong>${role}</strong></p>
        </div>
        <div style="padding:24px;">
          <p>Hi ${firstName || 'there'},</p>
          <p>You have been invited to join Vibranium 5.0 with the role: <strong>${role}</strong>.</p>
          <p>Please click the button below to sign up or sign in and complete your access:</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${inviteLink}" style="background:#a78bfa;color:#111827;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;display:inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size:12px;color:#9ca3af;">If the button doesn't work, copy and paste this link: <br/>${inviteLink}</p>
        </div>
        <div style="background:#0b0f19;padding:12px;text-align:center;color:#9ca3af;font-size:12px;">© 2025 Vibranium 5.0</div>
      </div>`;

    const info = await transporter.sendMail({
      from: `Vibranium 5.0 <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Invitation to Vibranium 5.0 as ${role}`,
      html,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || 'Failed to send invite' });
  }
}


