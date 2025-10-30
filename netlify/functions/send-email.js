// netlify/functions/send-email.js
import nodemailer from 'nodemailer';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { to, subject, html } = JSON.parse(event.body || '{}');
    if (!to || !subject || !html) return { statusCode: 400, body: 'Missing fields' };

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.O365_USER,   // ej. notificaciones@progel.com.mx
        pass: process.env.O365_PASS    // contraseña o app password
      }
    });

    const info = await transporter.sendMail({
      from: process.env.O365_USER,
      to,
      subject,
      html
    });

    return { statusCode: 200, body: JSON.stringify({ ok:true, messageId: info.messageId }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
}