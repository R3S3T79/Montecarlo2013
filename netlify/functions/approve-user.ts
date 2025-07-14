import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// In Netlify Functions, export handler as AWS Lambda
export const handler = async (event, context) => {
  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { email, username, password } = body;
  if (!email || !username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' }),
    };
  }

  // Initialize Supabase client with service role
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Setup SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // Generate confirmation token
    const confirmation_token = crypto.randomBytes(32).toString('hex');

    // Insert pending user
    const { error: insertError } = await supabase
      .from('pending_users')
      .insert({ email, username, password, confirmation_token });
    if (insertError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: insertError.message }),
      };
    }

    // Build confirmation URL
    const confirmUrl = `https://${process.env.URL ?? 'montecarlo2013.netlify.app'}/.netlify/functions/confirm?token=${confirmation_token}`;

    // Send confirmation email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Conferma la tua registrazione – Montecarlo 2013',
      html: `
        <p>Ciao ${username},</p>
        <p>Per completare la registrazione, clicca qui:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
        <p>Il link scade tra 24 ore.</p>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err: any) {
    console.error('Register Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
};
