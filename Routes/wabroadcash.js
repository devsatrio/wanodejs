//const wbm = require('wbm');
const express = require('express')
const { Client } = require('whatsapp-web.js');
const client = new Client();
var qrcode = require('qrcode-terminal');
const fs = require('fs');
const SESSION_FILE_PATH = './session.json';

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
let app = express.Router()

app.get('/', function (req, res) {
    res.send('wabroadcash home');
});

app.get('/send', function (req, res) {
    const client = new Client({ puppeteer: { headless: false }, session: sessionCfg });

    client.initialize();

    client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    });

    client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
    });

    client.on('auth_failure', msg => {
        console.error('AUTHENTICATION FAILURE', msg);
    });

    client.on('ready', () => {
        client.sendMessage('6282245320318'+'@c.us', 'wa node js').then((response) => {});
    });
});

app.get('/send/dua', function (req, res) {
    // wbm.start({showBrowser: true, qrCodeData: true, session: true}).then(async () => {
    //     const phones = ['6282245320318'];
    //     const message = 'Good Morning.';
    //     await wbm.send(phones, message);
    //     await wbm.end();
    // }).catch(err => console.log(err));
    
});
module.exports = app