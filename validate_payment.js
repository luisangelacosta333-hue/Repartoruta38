export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: 'Método no permitido' });

    try {
        const { local, fotoBase64 } = req.body;
        if (!local || !fotoBase64) return res.status(400).json({ success: false, msg: 'Faltan datos.' });

        const openAiKey = process.env.OPENAI_API_KEY;
        const supabaseKey = process.env.SUPABASE_SECRET_KEY;

        if (!openAiKey || !supabaseKey) {
            return res.status(500).json({ success: false, msg: 'Faltan llaves en el servidor.' });
        }

        // 1. LA ORDEN ESTRICTA PARA OPENAI (Tus datos reales están protegidos acá)
        const systemPrompt = `Sos un auditor financiero extremadamente estricto. Analizá este comprobante de transferencia bancaria.
        Debe cumplir TODAS estas condiciones sin excepción:
        1. El monto transferido debe ser EXACTAMENTE $9.000 (nueve mil pesos argentinos).
        2. El destinatario debe ser obligatoriamente: "Luis Ángel Acosta", O el Alias: "noir.elite.ceo", O el CBU: "0110257630025717844115".
        3. El estado de la transferencia debe ser "Aprobada", "Exitosa" o similar. No se aceptan transferencias programadas ni pendientes.
        
        Devolveme UNICAMENTE un objeto JSON estricto con este formato: {"aprobado": true, "motivo": "Explicación corta"}.
        Si falta un solo dato o algo es sospechoso, respondé {"aprobado": false, "motivo": "Por qué se rechazó"}.`;

        const openAiPayload = {
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: systemPrompt },
                        { type: "image_url", image_url: { url: fotoBase64 } }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 200
        };

        // 2. MANDAMOS EL COMPROBANTE AL OJO BIÓNICO
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(openAiPayload)
        });

        const openAiData = await openAiRes.json();
        
        if (!openAiData.choices || !openAiData.choices[0].message) {
            throw new Error("OpenAI no respondió correctamente.");
        }

        const iaDecision = JSON.parse(openAiData.choices[0].message.content);

        // 3. SI LA IA LO RECHAZA, CORTAMOS ACÁ Y LE AVISAMOS AL CLIENTE
        if (!iaDecision.aprobado) {
            return res.status(200).json({ success: false, msg: "Ticket Rechazado: " + iaDecision.motivo });
        }

        // 4. SI LA IA APRUEBA, ABRIMOS LA BÓVEDA Y DAMOS LOS 30 DÍAS
        const supabaseUrl = 'https://drpjcmznauposqlhaveo.supabase.co';
        const fechaHoy = new Date().toISOString();

        const updateRes = await fetch(`${supabaseUrl}/rest/v1/ruta38_usuarios?local=eq.${encodeURIComponent(local)}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ created_at: fechaHoy })
        });

        if (!updateRes.ok) {
            throw new Error("Error al abrir el candado de la base de datos.");
        }

        // ¡ÉXITO TOTAL!
        return res.status(200).json({ success: true, msg: "¡Pago Aprobado y 30 días renovados!" });

    } catch (error) {
        return res.status(500).json({ success: false, msg: error.message });
    }
}

