export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local } = req.body;
        if (!local) return res.status(400).json({ success: false, msg: 'Falta el nombre del local' });

        const UALA_USER = process.env.UALA_USERNAME;
        const UALA_ID = process.env.UALA_CLIENT_ID; 
        const UALA_SECRET = process.env.UALA_CLIENT_SECRET;

        if (!UALA_USER || !UALA_ID || !UALA_SECRET) {
            return res.status(500).json({ success: false, msg: 'Faltan credenciales en Vercel.' });
        }

        // PASO 1: Loguearse en Ualá (Usando la ruta api/v1/)
        const authResponse = await fetch('https://auth.ualabis.com.ar/api/v1/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: UALA_USER,
                client_id: UALA_ID,
                client_secret_id: UALA_SECRET,
                grant_type: 'client_credentials'
            })
        });

        // Lo leemos como texto por si Ualá tira un error raro que no sea JSON
        const authText = await authResponse.text();
        let authData;
        try {
            authData = JSON.parse(authText);
        } catch(e) {
            return res.status(500).json({ success: false, msg: 'Error Raro en Auth Ualá: ' + authText.substring(0, 60) });
        }

        if (!authData.access_token) {
            return res.status(401).json({ success: false, msg: 'Ualá rechazó las llaves. Revisá que el Usuario, ID y Secret estén bien copiados en Vercel.' });
        }

        const accessToken = authData.access_token;

        // PASO 2: Crear el link de cobro
        const checkoutResponse = await fetch('https://checkout.ualabis.com.ar/api/v1/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: "9000.00",
                description: `Renovación 30 días - Local: ${local}`,
                callback_fail: "https://www.ruta38envios.com.ar",
                callback_success: "https://www.ruta38envios.com.ar"
            })
        });

        const checkoutText = await checkoutResponse.text();
        let checkoutData;
        try {
            checkoutData = JSON.parse(checkoutText);
        } catch(e) {
            return res.status(500).json({ success: false, msg: 'Error Raro en Checkout Ualá: ' + checkoutText.substring(0, 60) });
        }

        if (checkoutData && checkoutData.links && checkoutData.links.checkoutLink) {
            return res.status(200).json({ success: true, link: checkoutData.links.checkoutLink });
        } else {
            return res.status(400).json({ success: false, msg: 'Ualá no dio el link: ' + JSON.stringify(checkoutData).substring(0, 100) });
        }

    } catch (error) {
        // Acá está la magia: si Vercel explota, ahora te manda a la pantalla QUÉ explotó
        return res.status(500).json({ success: false, msg: 'Vercel falló: ' + error.message });
    }
}

