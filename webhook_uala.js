export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    try {
        const body = req.body;
        
        if (body && body.status && body.status.toUpperCase() === 'APPROVED') {
            
            const extRef = body.external_reference || "";
            // Cortamos el texto justo donde están los "___" y nos quedamos con la primera parte (el nombre)
            const localName = extRef.split('___')[0]; 

            if (localName) {
                const supabaseUrl = 'https://drpjcmznauposqlhaveo.supabase.co';
                const supabaseKey = 'sb_publishable_xo7-uUQqtWvEWoLGqqlrsg_rxdroLx4';

                const nuevaFecha = new Date();
                nuevaFecha.setDate(nuevaFecha.getDate() + 30);

                await fetch(`${supabaseUrl}/rest/v1/usuarios?local=eq.${encodeURIComponent(localName)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ fecha_vencimiento: nuevaFecha.toISOString() })
                });
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error en Webhook:', error);
        return res.status(500).json({ success: false });
    }
}

