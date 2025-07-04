// netlify/functions/send-confirm-email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function handler(event) {
  const { email, confirm_link } = JSON.parse(event.body || '{}');
  if (!email || !confirm_link) {
    return { statusCode: 400, body: 'Dati mancanti' };
  }

  const msg = {
    to: email,
    from: 'no-reply@tuo-dominio.com',
    subject: 'Conferma il tuo account',
    html: `
      <p>Ciao,</p>
      <p>clicca qui per confermare il tuo account:</p>
      <p><a href="${confirm_link}">${confirm_link}</a></p>
    `,
  };

  try {
    await sgMail.send(msg);
    return { statusCode: 200, body: 'Email inviata' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Errore invio email' };
  }
}
