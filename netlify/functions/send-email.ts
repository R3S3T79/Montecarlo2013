import nodemailer from 'nodemailer';

export const handler = async (event: any) => {
  // --- LOG VARIABILI D’AMBIENTE SMTP ---
  console.log('SMTP_HOST =', process.env.SMTP_HOST);
  console.log('SMTP_PORT =', process.env.SMTP_PORT);
  console.log('SMTP_SECURE =', process.env.SMTP_SECURE);
  console.log('SMTP_USER =', process.env.SMTP_USER);
  console.log('SMTP_PASS is set? →', Boolean(process.env.SMTP_PASS));
  console.log('SMTP_FROM =', process.env.SMTP_FROM);
  // ----------------------------------------

  try {
    // Legge sia html sia text per maggiore flessibilità
    const { to, subject, text, html } = JSON.parse(event.body || '{}');

    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Dati mancanti: to, subject e html o text obbligatori',
        }),
      };
    }

    // Configura il transporter SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true', // true se porta 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Prepara il contenuto dell’email
    const mailOptions: { from: string; to: string; subject: string; text?: string; html?: string } = {
      from: process.env.SMTP_FROM!,
      to,
      subject,
    };
    if (text) mailOptions.text = text;
    if (html) mailOptions.html = html;

    // Invia
    const info = await transporter.sendMail(mailOptions);
    console.log('Email inviata, messageId =', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email inviata con successo',
        messageId: info.messageId,
      }),
    };
  } catch (err: any) {
    console.error('Errore invio email:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Errore interno nel server email',
        error: err.message,
      }),
    };
  }
};
