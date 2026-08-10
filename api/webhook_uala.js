export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(200).send('OK');

    try {
        const body = req.body;
        
        if (body && body.status && body.status.toUpperCase() === 'APPROVED') {
            
            const extRef = body.external_reference || "";
            const hexLocal = extRef.split('-')[0]; 
            
            // "Desencriptamos" el código Hexadecimal que mandamos
            const localName = Buffer.from(hexLocal, 'hex').toString('utf8');

            if (localName) {
                const supabaseUrl = 'https://drpjcmznauposqlhaveo.supabase.co';
                
                // USAMOS LA VARIABLE DE ENTORNO EN VEZ DE LA LLAVE PÚBLICA
                // Esto es lo que permite saltar el candado RLS que pusiste
                const supabaseKey = process.env.SUPABASE_SECRET_KEY;

                if (!supabaseKey) {
                    throw new Error("Falta la llave secreta en Vercel");
                }

                // Tomamos el reloj exacto de este segundo (HOY)
                const fechaHoy = new Date().toISOString();

                // Actualizamos usando la llave maestra para que el candado RLS no moleste
                await fetch(`${supabaseUrl}/rest/v1/ruta38_usuarios?local=eq.${encodeURIComponent(localName)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ created_at: fechaHoy })
                });
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error en Webhook:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
}

