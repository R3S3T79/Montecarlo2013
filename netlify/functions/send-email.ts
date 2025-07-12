import nodemailer from 'nodemailer';

export const handler = async (event: any) => {
  try {
    const { to, subject, html } = JSON.parse(event.body || '{}');

    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Dati mancanti: to, subject e html obbligatori' }),
      };
    }

    // Configura il transporter SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // es. smtp.aruba.it o smtp.mailgun.org
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true se port 465
      auth: {
        user: process.env.SMTP_USER, // notifications@montecarlo.it
        pass: process.env.SMTP_PASS, // la password o app password
      },
    });

    const info = await transporter.sendMail({
      from: `"Montecarlo 2013" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Email inviata:', info.messageId);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email inviata con successo' }),
    };
  } catch (err) {
    console.error('Errore invio email:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Errore interno nel server email' }),
    };
  }
};
