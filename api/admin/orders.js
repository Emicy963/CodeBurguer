const crypto = require('crypto');

function verifyToken(token, secret) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const parts = decoded.split(':');
        if (parts.length < 3) return false;
        const sig      = parts.pop();
        const ts       = parts.pop();
        const username = parts.join(':');
        if (Date.now() - Number(ts) > 8 * 60 * 60 * 1000) return false;
        const expected = crypto.createHmac('sha256', secret).update(`${username}:${ts}`).digest('hex');
        const sigBuf   = Buffer.from(sig, 'hex');
        const expBuf   = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
        return false;
    }
}

function auth(req, secret) {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
    return verifyToken(token, secret);
}

module.exports = async function handler(req, res) {
    const secret      = process.env.ADMIN_TOKEN_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!secret || !supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Servidor não configurado' });
    }

    if (!auth(req, secret)) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    const headers = {
        'apikey':        supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type':  'application/json'
    };

    // GET — lista todos os pedidos, mais recentes primeiro
    if (req.method === 'GET') {
        try {
            const r    = await fetch(`${supabaseUrl}/rest/v1/orders?order=created_at.desc`, { headers });
            const data = await r.json();
            return res.status(200).json(data);
        } catch {
            return res.status(500).json({ error: 'Erro ao buscar pedidos' });
        }
    }

    // PATCH — actualiza o status de um pedido
    if (req.method === 'PATCH') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { id, status } = body || {};

        const validStatuses = ['pendente', 'em_preparacao', 'a_caminho', 'entregue'];
        if (!id || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'id ou status inválido' });
        }

        try {
            await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
                method:  'PATCH',
                headers: { ...headers, 'Prefer': 'return=minimal' },
                body:    JSON.stringify({ status })
            });
            return res.status(200).json({ ok: true });
        } catch {
            return res.status(500).json({ error: 'Erro ao actualizar pedido' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
