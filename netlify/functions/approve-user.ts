import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
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

  // Verifica header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.replace('Bearer ', '');

  // Decodifica e controlla ruolo
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (decoded.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  // Recupera pending_user confermato
  const { data: pendingUser, error } = await supabase
    .from('pending_users')
    .select('id, username, password')
    .eq('email', email)
    .eq('confirmed', true)
    .single();

  if (error || !pendingUser) {
    return res.status(404).json({ error: 'Pending user not found or not confirmed' });
  }

  const { username, password } = pendingUser;

  // Crea utente in auth.users con password in chiaro
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { username },
    email_confirm: true,
  });

  if (createError) {
    return res.status(500).json({ error: 'Error creating user', details: createError.message });
  }

  // Pulisce la password dalla tabella pending_users
  await supabase
    .from('pending_users')
    .update({ password: '' })
    .eq('email', email);

  // Invia email di benvenuto
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Benvenuto su Montecarlo 2013',
    html: `
      <p>Ciao ${username},</p>
      <p>La tua registrazione è stata approvata. Ora puoi accedere con email e password.</p>
      <p><a href="https://montecarlo2013.it/login">Accedi</a></p>
    `,
  });

  return res.status(200).json({ success: true });
}
