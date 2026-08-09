export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    try {
        const body = req.body;
        
        if (body && body.status && body.status.toUpperCase() === 'APPROVED') {
            
            const extRef = body.external_reference || "";
            const hexLocal = extRef.split('-')[0]; 
            
            // "Desencriptamos" el código Hexadecimal que mandamos, devolviéndolo al nombre original
            const localName = Buffer.from(hexLocal, 'hex').toString('utf8');

            if (localName) {
                const supabaseUrl = 'https://drpjcmznauposqlhaveo.supabase.co';
                const supabaseKey = 'sb_publishable_xo7-uUQqtWvEWoLGqqlrsg_rxdroLx4';

                // Tomamos el reloj exacto de este segundo (HOY)
                const fechaHoy = new Date().toISOString();

                // ACA ESTABA EL ERROR: Apuntamos a ruta38_usuarios en vez de usuarios
                await fetch(`${supabaseUrl}/rest/v1/ruta38_usuarios?local=eq.${encodeURIComponent(localName)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    // Le reseteamos la fecha de creación a HOY para que la app le dé 30 días limpios
                    body: JSON.stringify({ created_at: fechaHoy })
                });
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error en Webhook:', error);
        return res.status(500).json({ success: false });
    }
}

