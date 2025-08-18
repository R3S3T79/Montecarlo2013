// netlify/functions/approve-user.ts
import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  // --- Controllo token JWT ---
  const authHeader = event.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing or invalid authorization header' }) }
  }
  const token = authHeader.replace('Bearer ', '')

  let decoded: any
  try {
    decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!)
  } catch (e: any) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token', details: e.message }) }
  }

  const userRole = decoded.app_metadata?.role || decoded.raw_app_meta_data?.role
  if (userRole !== 'creator') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Access denied: Creators only' }) }
  }

  // --- Leggi body ---
  let body: { email?: string; role?: string }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }
  const { email, role } = body
  if (!email || !role) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or role' }) }
  }

  // --- Recupera pending user ---
  const { data: pendingUser, error: selectError } = await supabase
    .from('pending_users')
    .select('username, password, confirmed')
    .eq('email', email)
    .single()

  if (selectError || !pendingUser || !pendingUser.confirmed) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Pending user not found or not confirmed' }) }
  }

  const { username, password } = pendingUser

  // --- Controlla se esiste già in Auth ---
  const { data: listRes, error: listErr } = await supabase.auth.admin.listUsers({ filter: `email=eq.${email}` })
  if (listErr) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error listing users', details: listErr.message }) }
  }

  let userId: string
  if (listRes.users.length === 0) {
    // Non esiste → crea
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username, role },
      email_confirm: true,
    })
    if (createError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Error creating user', details: createError.message }) }
    }
    userId = newUser.id
  } else {
    // Esiste → aggiorna ruolo
    const existing = listRes.users[0]
    userId = existing.id
    const existingMeta = existing.user_metadata || {}
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMeta, role },
    })
    if (updateErr) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Error updating role', details: updateErr.message }) }
    }
  }

  // --- Aggiorna pending_users (password vuota + ruolo) ---
  await supabase.from('pending_users').update({ password: null, role }).eq('email', email)

  // --- Invia mail ---
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Benvenuto su Montecarlo 2013',
    html: `
      <p>Ciao ${username},</p>
      <p>La tua registrazione è stata approvata con ruolo <b>${role}</b>. Ora puoi accedere con email e password.</p>
      <p><a href="https://montecarlo2013.it/login">Accedi</a></p>
    `,
  })

  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
