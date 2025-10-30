// netlify/functions/notify-new-message.js
import nodemailer from 'nodemailer';

async function sendMail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: { user: process.env.O365_USER, pass: process.env.O365_PASS }
  });
  return transporter.sendMail({ from: process.env.O365_USER, to, subject, html });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');

    // según la versión de Webhooks:
    // new row puede venir en body.record o body.new o body.data.new
    const record = body.record || body.new || (body?.data?.new) || {};
    const { case_id, sender, body: msgBody, created_at } = record;

    // Necesitamos datos del caso (emails y public_case_id). Haz un fetch a Supabase REST con anon key
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_ANON_KEY; // mejor service_role si puedes
    const r = await fetch(`${SUPABASE_URL}/rest/v1/cases?id=eq.${case_id}&select=public_case_id,company,product,customer_email,supplier_email`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const [c] = await r.json();

    if (!c) return { statusCode: 200, body: JSON.stringify({ ok:true, skip:'case not found' }) };

    const to = sender === 'Cliente' ? c.supplier_email : c.customer_email;
    if (!to) return { statusCode: 200, body: JSON.stringify({ ok:true, skip:'no recipient' }) };

    const otherRole = sender === 'Cliente' ? 'Proveedor' : 'Cliente';
    const link = `https://desarrollotecnicoprueba.netlify.app/case.html?cid=${c.public_case_id}&role=${otherRole}`;

    const subject = `Nuevo mensaje de ${sender} – ${c.company}`;
    const html = `
      <p>Tienes un nuevo mensaje de <b>${sender}</b> en el caso de <b>${c.company}</b> – ${c.product}.</p>
      <p><i>${new Date(created_at).toLocaleString()}</i></p>
      <blockquote>${(msgBody||'').replace(/</g,'&lt;')}</blockquote>
      <p><a href="${link}">Abrir caso y responder</a></p>
    `;

    await sendMail(to, subject, html);
    return { statusCode: 200, body: JSON.stringify({ ok:true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:e.message }) };
  }
}