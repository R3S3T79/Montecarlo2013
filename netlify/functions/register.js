// netlify/functions/register.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event) => {
  try {
    const { email, password, role = 'user' } = JSON.parse(event.body);

    // 1) Validazioni minime
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return { statusCode: 400, body: 'Email non valida' };
    }
    if (!password || password.length < 6) {
      return { statusCode: 400, body: 'Password troppo corta' };
    }
    if (!['user','admin','creator'].includes(role)) {
      return { statusCode: 400, body: 'Ruolo non valido' };
    }

    // 2) Hash della password
    const password_hash = await bcrypt.hash(password, 10);

    // 3) Chiamata alla RPC per creare il pending_user
    const { data: pendingId, error: rpcError } = await supabase
      .rpc('create_pending_user', {
        p_email:          email,
        p_password_hash:  password_hash,
        p_requested_role: role
      });
    if (rpcError) throw rpcError;

    // 4) Recupero il confirmation_token appena generato
    const { data: pending, error: fetchError } = await supabase
      .from('pending_users')
      .select('confirmation_token')
      .eq('id', pendingId)
      .single();
    if (fetchError) throw fetchError;
    const token = pending.confirmation_token;

    // 5) Costruisci il link di conferma
    const confirmUrl = `https://tuo-dominio/confirm?token=${token}`;

    // 6) Invia l’email di conferma
    const msg = {
      to:      email,
      from:    'no-reply@tuo-dominio.com',
      subject: 'Conferma il tuo account',
      html: `
        <p>Ciao,</p>
        <p>clicca qui per confermare il tuo account:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      `
    };
    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Registrazione ricevuta, controlla la tua email' })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: 'Errore interno durante la registrazione'
    };
  }
};
