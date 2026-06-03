const crypto = require('crypto');

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function makeToken(username, secret) {
    const ts = Date.now();
    const sig = crypto.createHmac('sha256', secret).update(`${username}:${ts}`).digest('hex');
    return Buffer.from(`${username}:${ts}:${sig}`).toString('base64');
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};

    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;
    const secret      = process.env.ADMIN_TOKEN_SECRET;

    if (!expectedUser || !expectedHash || !secret) {
        return res.status(500).json({ error: 'Admin não configurado' });
    }

    if (username !== expectedUser || sha256(password || '') !== expectedHash) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    return res.status(200).json({ token: makeToken(username, secret) });
};
