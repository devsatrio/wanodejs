var express = require('express');
const { client } = require('./index');
var app = express();

function formatPhoneNumber(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/\D/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    if (!clean.endsWith('@c.us')) {
        clean = clean + '@c.us';
    }
    return clean;
}

app.post('/send-contoh', async function (req, res) {
	const { nomor, msg } = req.body;
	const finalTelp = formatPhoneNumber(nomor);
    if (!finalTelp) {
        return res.json({ message: 'Nomor telepon tidak valid', code: 400 });
    }
	try {
		const response = await client.sendMessage(finalTelp, String(msg));
		res.json({
			message: response,
			code: 200,
		});
	} catch (err) {
		res.json({
			message: err.message || err,
			code: 201,
		});
	}
});

module.exports = app;