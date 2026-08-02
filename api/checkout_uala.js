export default async function handler(req, res) {
    // 1. Damos permiso para que tu app web se pueda conectar sin bloqueos de seguridad (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, msg: 'Método no permitido' });
    }

    try {
        // Obtenemos el nombre del local que viene desde la app
        const { local } = req.body;

        if (!local) {
            return res.status(400).json({ success: false, msg: 'Falta el nombre del local' });
        }

        // 3. Acá Vercel lee la llave que subiste a las Variables de Entorno
        // IMPORTANTE: Asegurate de que en Vercel tu variable se llame UALA_SECRET_KEY
        const UALA_KEY = process.env.UALA_SECRET_KEY;

        if (!UALA_KEY) {
            return res.status(500).json({ success: false, msg: 'Faltan las llaves de Ualá en Vercel' });
        }

        // 4. Le pedimos a Ualá Bis que genere el link de cobro por $9.000
        const respuestaUala = await fetch('https://checkout.ualabis.com.ar/1/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UALA_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: "9000.00",
                description: `Renovación 30 días - Local: ${local}`,
                // Esta es la URL a la que el cliente volverá si el pago es exitoso
                callback_success: "https://www.ruta38envios.com.ar", 
                callback_fail: "https://www.ruta38envios.com.ar"
            })
        });

        const dataUala = await respuestaUala.json();

        // 5. Si Ualá nos devuelve el link correctamente, se lo pasamos al celular
        if (dataUala && dataUala.links && dataUala.links.checkoutLink) {
            return res.status(200).json({ 
                success: true, 
                link: dataUala.links.checkoutLink 
            });
        } else {
            console.error("Respuesta de Ualá:", dataUala);
            return res.status(400).json({ success: false, msg: 'Ualá rechazó la creación del link.' });
        }

    } catch (error) {
        console.error("Error en el backend:", error);
        return res.status(500).json({ success: false, msg: 'El servidor de Vercel falló al procesar el pago.' });
    }
}

