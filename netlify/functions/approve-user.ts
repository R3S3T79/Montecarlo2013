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
  // 1) Metodo
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  // 2) Autorizzazione
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
  if (decoded.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Access denied: Admins only' }) }
  }

  // 3) Body
  let body: { email?: string }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }
  const { email } = body
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing email' }) }
  }

  // 4) Recupera pending_user
  const { data: pendingUser, error: selectError } = await supabase
    .from('pending_users')
    .select('username, password')
    .eq('email', email)
    .eq('confirmed', true)
    .single()

  if (selectError || !pendingUser) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Pending user not found or not confirmed' }) }
  }
  const { username, password } = pendingUser

  // 5) Crea utente in Auth
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { username },
    email_confirm: true,
  })
  if (createError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error creating user', details: createError.message }) }
  }

  // 6) Pulizia e email di benvenuto
  await supabase.from('pending_users').update({ password: '' }).eq('email', email)
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Benvenuto su Montecarlo 2013',
    html: `
      <p>Ciao ${username},</p>
      <p>La tua registrazione è stata approvata. Ora puoi accedere con email e password.</p>
      <p><a href="https://montecarlo2013.it/login">Accedi</a></p>
    `,
  })

  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
