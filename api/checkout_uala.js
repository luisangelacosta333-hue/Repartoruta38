import https from 'https';

// 1. TRASPLANTAMOS TU FUNCIÓN EXACTA DE "NI UNA MENOS"
const hp = (h, p, d, a = '') => new Promise((rs, rj) => {
    const o = {
        hostname: h,
        port: 443,
        path: p,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(d),
            ...(a ? { Authorization: a } : {})
        }
    };
    const q = https.request(o, r => {
        let c = '';
        r.setEncoding('utf8');
        r.on('data', x => c += x);
        r.on('end', () => {
            try { rs(JSON.parse(c)); } catch { rs(c); }
        });
    });
    q.on('error', rj);
    q.write(d);
    q.end();
});

export default async function handler(req, res) {
    // Permisos CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local } = req.body;
        if (!local) return res.status(400).json({ success: false, msg: 'Falta el nombre del local' });

        // Leemos las 3 variables de Vercel
        const UALA_USER = process.env.UALA_USERNAME?.trim();
        const UALA_ID = process.env.UALA_CLIENT_ID?.trim(); 
        const UALA_SECRET = process.env.UALA_CLIENT_SECRET?.trim();

        if (!UALA_USER || !UALA_ID || !UALA_SECRET) {
            return res.status(500).json({ success: false, msg: 'Faltan credenciales de Ualá en Vercel.' });
        }

        // ==========================================
        // PASO 1: TOKEN (PRODUCCIÓN)
        // Apuntando directo a auth.ua.la
        // ==========================================
        const payloadToken = JSON.stringify({
            username: UALA_USER,
            client_id: UALA_ID,
            client_secret_id: UALA_SECRET,
            grant_type: 'client_credentials'
        });

        const tk = await hp('auth.ua.la', '/v2/api/auth/token', payloadToken);

        if (!tk || !tk.access_token) {
            return res.status(401).json({ success: false, msg: 'Error de Token Ualá: ' + JSON.stringify(tk) });
        }

        // ==========================================
        // PASO 2: CHECKOUT (PRODUCCIÓN)
        // Apuntando directo a checkout.ua.la
        // ==========================================
        const payloadCheckout = JSON.stringify({
            amount: "9000.00",
            description: `Renovacion 30 dias - Local: ${local}`,
            callback_success: "https://www.ruta38envios.com.ar",
            callback_fail: "https://www.ruta38envios.com.ar",
            notification_url: "https://www.ruta38envios.com.ar/api/webhook_uala" // Campo exigido
        });

        const pg = await hp('checkout.ua.la', '/v2/api/checkout', payloadCheckout, `Bearer ${tk.access_token}`);

        const link = pg?.links?.checkout_link || pg?.checkout_link;

        if (link) {
            return res.status(200).json({ success: true, link: link });
        } else {
            return res.status(400).json({ success: false, msg: 'Ualá no dio link: ' + JSON.stringify(pg) });
        }

    } catch (error) {
        return res.status(500).json({ success: false, msg: 'Error de servidor: ' + error.message });
    }
}
