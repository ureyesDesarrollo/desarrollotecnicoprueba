export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { to, subject, html } = JSON.parse(event.body || '{}');
    if (!to || !subject || !html) {
      return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Missing fields' }) };
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // o el remitente que uses
        to: [to],
        subject,
        html
      })
    });

    const data = await r.json();
    if (!r.ok) return { statusCode: 500, body: JSON.stringify({ ok:false, error: data }) };
    return { statusCode: 200, body: JSON.stringify({ ok:true, data }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
}