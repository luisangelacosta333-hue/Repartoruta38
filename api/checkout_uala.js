export default async function handler(req, res) {
    // 1. Permisos para que la app se conecte sin bloqueos
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local } = req.body;
        if (!local) return res.status(400).json({ success: false, msg: 'Falta el nombre del local' });

        // 2. Leemos las 3 variables que YA TENÉS guardadas en Vercel
        const UALA_USER = process.env.UALA_USERNAME;
        const UALA_ID = process.env.UALA_CLIENT_ID; 
        const UALA_SECRET = process.env.UALA_CLIENT_SECRET;

        if (!UALA_USER || !UALA_ID || !UALA_SECRET) {
            return res.status(500).json({ success: false, msg: 'Faltan credenciales de Ualá en Vercel. Revisá los nombres.' });
        }

        // 3. PASO 1: Loguearse en Ualá para pedir el Token Temporal
        const authResponse = await fetch('https://auth.ualabis.com.ar/1/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: UALA_USER,
                client_id: UALA_ID,
                client_secret_id: UALA_SECRET,
                grant_type: 'client_credentials'
            })
        });

        const authData = await authResponse.json();

        if (!authData.access_token) {
            console.error("Error Auth Ualá:", authData);
            return res.status(401).json({ success: false, msg: 'Fallo al iniciar sesión en Ualá. Credenciales inválidas.' });
        }

        const accessToken = authData.access_token;

        // 4. PASO 2: Crear el link de pago con el Token que nos acaban de dar
        const checkoutResponse = await fetch('https://checkout.ualabis.com.ar/1/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: "9000.00",
                description: `Renovación 30 días - Local: ${local}`,
                callback_success: "https://www.ruta38envios.com.ar", 
                callback_fail: "https://www.ruta38envios.com.ar"
            })
        });

        const checkoutData = await checkoutResponse.json();

        // 5. Devolverle el link a la App
        if (checkoutData && checkoutData.links && checkoutData.links.checkoutLink) {
            return res.status(200).json({ success: true, link: checkoutData.links.checkoutLink });
        } else {
            console.error("Error Checkout Ualá:", checkoutData);
            return res.status(400).json({ success: false, msg: 'Ualá no pudo generar el link.' });
        }

    } catch (error) {
        console.error("Error Servidor Vercel:", error);
        return res.status(500).json({ success: false, msg: 'Error interno del servidor.' });
    }
}

