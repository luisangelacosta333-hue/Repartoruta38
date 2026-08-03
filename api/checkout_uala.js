export default async function handler(req, res) {
    // Permisos CORS para la app
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local } = req.body;
        if (!local) return res.status(400).json({ success: false, msg: 'Falta el nombre del local' });

        // Leemos las 3 variables de Vercel usando .trim() exactamente como en Ni una Menos
        const UALA_USER = process.env.UALA_USERNAME?.trim();
        const UALA_ID = process.env.UALA_CLIENT_ID?.trim(); 
        const UALA_SECRET = process.env.UALA_CLIENT_SECRET?.trim();

        if (!UALA_USER || !UALA_ID || !UALA_SECRET) {
            return res.status(500).json({ success: false, msg: 'Faltan credenciales de Ualá en Vercel.' });
        }

        // ==========================================
        // PASO 1: TOKEN (Ruta exacta de Ni una Menos)
        // ==========================================
        const authResponse = await fetch('https://auth.developers.ar.ua.la/v2/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: UALA_USER,
                client_id: UALA_ID,
                client_secret_id: UALA_SECRET,
                grant_type: 'client_credentials'
            })
        });

        const authText = await authResponse.text();
        let authData;
        try { authData = JSON.parse(authText); } catch(e) { }

        if (!authData || !authData.access_token) {
            return res.status(401).json({ success: false, msg: 'Error de Token Ualá: ' + authText.substring(0, 50) });
        }

        const accessToken = authData.access_token;

        // ==========================================
        // PASO 2: CHECKOUT (Ruta exacta de Ni una Menos)
        // ==========================================
        const orderResponse = await fetch('https://checkout.developers.ar.ua.la/v2/api/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: "9000.00",
                description: `Renovacion 30 dias - Local: ${local}`,
                callback_fail: "https://www.ruta38envios.com.ar",
                callback_success: "https://www.ruta38envios.com.ar"
            })
        });

        const orderText = await orderResponse.text();
        let orderData;
        try { orderData = JSON.parse(orderText); } catch(e) {}

        // Buscamos el link exactamente como lo busca Ni una Menos
        const checkoutUrl = orderData?.links?.checkout_link || orderData?.checkout_link;

        if (checkoutUrl) {
            return res.status(200).json({ success: true, link: checkoutUrl });
        } else {
            return res.status(400).json({ success: false, msg: 'Ualá no devolvió link: ' + orderText.substring(0, 80) });
        }

    } catch (error) {
        return res.status(500).json({ success: false, msg: 'Error de servidor: ' + error.message });
    }
}

