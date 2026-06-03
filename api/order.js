module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { orderNum, dataHora, cliente, contacto, localizacao, itens, subtotal, taxaEntrega, total } = body;

    // Encaminha para o Google Apps Script (mantém comportamento existente)
    const scriptUrl = process.env.APPS_SCRIPT_URL;
    if (scriptUrl) {
        try {
            await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch {}
    }

    // Guarda no Supabase (falha silenciosa — não bloqueia o pedido)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
        try {
            await fetch(`${supabaseUrl}/rest/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    order_num:    orderNum,
                    data_hora:    dataHora,
                    cliente,
                    contacto,
                    localizacao,
                    itens,
                    subtotal,
                    taxa_entrega: taxaEntrega,
                    total
                })
            });
        } catch {}
    }

    return res.status(200).json({ ok: true });
};
