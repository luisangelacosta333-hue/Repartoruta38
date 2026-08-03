export default async function handler(req, res) {
    // Permisos para que la app se conecte sin bloqueos
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local } = req.body;
        if (!local) return res.status(400).json({ success: false, msg: 'Falta el nombre del local' });

        // Leemos las 3 variables guardadas en Vercel
        const UALA_USER = process.env.UALA_USERNAME;
        const UALA_ID = process.env.UALA_CLIENT_ID; 
        const UALA_SECRET = process.env.UALA_CLIENT_SECRET;

        if (!UALA_USER || !UALA_ID || !UALA_SECRET) {
            return res.status(500).json({ success: false, msg: 'Faltan credenciales de Ualá en Vercel.' });
        }

        // PASO 1: Crear Token de Autenticación con la URL oficial v1
        let authResponse;
        try {
            authResponse = await fetch('https://auth.ualabis.com.ar/1/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: UALA_USER,
                    client_id: UALA_ID,
                    client_secret_id: UALA_SECRET,
                    grant_type: 'client_credentials'
                })
            });
        } catch (err) {
            return res.status(500).json({ success: false, msg: 'Error de red al pedir token: ' + err.message });
        }

        const authText = await authResponse.text();
        let authData;
        try {
            authData = JSON.parse(authText);
        } catch(e) {
            return res.status(500).json({ success: false, msg: 'Error raro en Ualá Token: ' + authText.substring(0, 50) });
        }

        if (!authData.access_token) {
            return res.status(401).json({ success: false, msg: 'Ualá rechazó tus credenciales. Revisá que el Usuario y Pass en Vercel no tengan espacios al final.' });
        }

        const accessToken = authData.access_token;

        // PASO 2: Crear Orden de Pago en Ualá Bis con la URL oficial
        let orderResponse;
        try {
            orderResponse = await fetch('https://checkout.ualabis.com.ar/1/checkout', {
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
        } catch (err) {
            return res.status(500).json({ success: false, msg: 'Error de red al crear orden: ' + err.message });
        }

        const orderText = await orderResponse.text();
        let orderData;
        try {
            orderData = JSON.parse(orderText);
        } catch(e) {
            return res.status(500).json({ success: false, msg: 'Error raro en Ualá Checkout: ' + orderText.substring(0, 50) });
        }

        // Buscamos el link de pago que nos devuelve Ualá
        const checkoutUrl = orderData.links?.checkoutLink || orderData.links?.checkout || orderData.checkout_link;

        if (checkoutUrl) {
            return res.status(200).json({ success: true, link: checkoutUrl });
        } else {
            return res.status(400).json({ success: false, msg: 'Fallo al armar link: ' + JSON.stringify(orderData).substring(0, 80) });
        }

    } catch (error) {
        return res.status(500).json({ success: false, msg: 'Error general Vercel: ' + error.message });
    }
}

