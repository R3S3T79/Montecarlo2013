import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const confirmation_token = crypto.randomBytes(32).toString('hex');

    const { error } = await supabase.from('pending_users').insert({
      email,
      password_hash,
      confirmation_token,
      username,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const confirmUrl = `https://montecarlo2013.it/api/confirm?token=${confirmation_token}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Conferma la tua registrazione – Montecarlo 2013',
      html: `
        <p>Ciao ${username},</p>
        <p>Conferma la tua registrazione cliccando sul link qui sotto:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
        <p>Il link scade tra 24 ore.</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
