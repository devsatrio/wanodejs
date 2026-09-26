require('dotenv').config();
const http = require('http');
const {connection}=require('./config/db');
// const wasend=require('./sendwhatsapp');
const socketIO=require('socket.io');
var bcrypt = require('bcrypt');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
require('events').EventEmitter.defaultMaxListeners = 100;

function add(x, y) {
	return x + y;
}
  
//--------------------------------------------------------------------
var express = require('express');
var mysql = require('mysql');
var session = require('express-session');
var bodyParser = require('body-parser');
var app = express();
const server = http.createServer(app);
const io = socketIO(server);

var flash = require('express-flash');
const svgCaptcha = require('svg-captcha');

// ------------------------------------------------------------------
const fs = require('fs');
const { response } = require('express');

const SESSION_FILE_PATH = './wa-session.json';
let sessioncfg;
if(fs.existsSync(SESSION_FILE_PATH)){
	sessioncfg = require(SESSION_FILE_PATH);
}

// Global state for WhatsApp
let currentQr = '';
let currentStatus = 'Sedang menginisialisasi WhatsApp Web...';
let isClientReady = false;

// Initialize WhatsApp Web Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    },
    restartOnAuthFail: true
});

client.on('qr', (qr) => {
    console.log('=== QR CODE RECEIVED (Scan via WhatsApp) ===');
    try {
        qrcodeTerminal.generate(qr, { small: true });
    } catch (e) {}
    qrcode.toDataURL(qr, (err, url) => {
        if (!err) {
            currentQr = url;
            currentStatus = 'QR Code diterima. Silakan scan melalui WhatsApp!';
            isClientReady = false;
            io.emit('qr', currentQr);
            io.emit('msg', currentStatus);
        }
    });
});

client.on('ready', () => {
    console.log('=== WhatsApp Client Ready & Terhubung! ===');
    isClientReady = true;
    currentQr = '/static/img/img.jpg';
    currentStatus = 'WhatsApp Ready & Terhubung!';
    io.emit('msg', currentStatus);
    io.emit('qr', currentQr);
});

client.on('authenticated', () => {
    console.log('WhatsApp Authenticated!');
    currentStatus = 'Autentikasi Berhasil! Memuat obrolan...';
    io.emit('msg', currentStatus);
});

client.on('auth_failure', (msg) => {
    console.error('WhatsApp Authentication Failure:', msg);
    isClientReady = false;
    currentStatus = 'Autentikasi Gagal: ' + msg;
    io.emit('msg', currentStatus);
});

client.on('loading_screen', (percent, message) => {
    console.log('WhatsApp Loading:', percent, message);
    currentStatus = 'Loading WhatsApp (' + percent + '%): ' + message;
    io.emit('msg', currentStatus);
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Disconnected:', reason);
    isClientReady = false;
    currentQr = '';
    currentStatus = 'WhatsApp Terputus: ' + reason + '. Menghubungkan ulang...';
    io.emit('msg', currentStatus);
    client.destroy();
    client.initialize();
});

io.on('connection', function(socket) {
    console.log('Browser connected to Socket.IO (ID: ' + socket.id + ')');
    if (isClientReady) {
        socket.emit('msg', 'WhatsApp Ready & Terhubung!');
        socket.emit('qr', '/static/img/img.jpg');
    } else if (currentQr) {
        socket.emit('qr', currentQr);
        socket.emit('msg', currentStatus);
    } else {
        socket.emit('msg', currentStatus);
    }
});

client.on('message', msg => {
    if (msg.body == "!ping") {
        msg.reply("pong");
    }
});

client.initialize();



// app.get('/generate',async(req,res)=>{
	
// })	

//--------------------------------------------------------------------
app.use(flash());
app.use(session({
	secret: process.env.SESSION_SECRET || 'wanode_session_secret_default',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
// app.use(wasend);
app.use(function (req, res, next) {
	res.locals.user = req.session.username || null;
	res.locals.level = req.session.level || null;
	res.locals.kodeid = req.session.kodeid || null;
	next();
  });
//--------------------------------------------------------------------
// var connection = mysql.createConnection({
// 	host     : 'localhost',
// 	user     : 'root',
// 	password : '',
// 	database : 'db_wanode'
// });

//-----------------------------------------------------------------
app.set('view engine', 'ejs');

//-----------------------------------------------------------------
app.get('/', function (req, res) {
	res.render('index');
});

//-----------------------------------------------------------------
// Endpoint Captcha SVG
app.get('/captcha', function (req, res) {
	const captcha = svgCaptcha.create({
		size: 4,
		noise: 2,
		color: true,
		background: '#f8f9fc',
		width: 140,
		height: 40,
		fontSize: 38,
		ignoreChars: '0o1ilI'
	});
	req.session.captcha = captcha.text.toLowerCase();
	res.type('svg');
	res.status(200).send(captcha.data);
});

//-----------------------------------------------------------------
app.use('/static', express.static('public'))

//-----------------------------------------------------------------
app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	var captchaInput = (request.body.captcha || '').trim().toLowerCase();
	var sessionCaptcha = (request.session.captcha || '').toLowerCase();

	// Validasi Captcha
	if (!captchaInput || !sessionCaptcha || captchaInput !== sessionCaptcha) {
		request.session.captcha = null;
		request.flash('infoerror', 'Kode Captcha salah! Silakan coba lagi.');
		return response.redirect('/');
	}

	// Reset captcha setelah dicek
	request.session.captcha = null;

	if (username && password) {
		connection.query('SELECT * FROM tb_users WHERE username = ? limit 1', [username], function(error, results, fields) {
			if (error) {
				console.error('[LOGIN DB ERROR]', error);
				request.flash('infoerror', 'Terjadi kesalahan sistem');
				return response.redirect('/');
			}
			if (results && results.length > 0) {
				var userRow = results[0];
				var userpass = userRow['password'];
				var level = userRow['level'];
				var kodeid = userRow['id'];

				var comparepass = bcrypt.compareSync(password, userpass);
				if (comparepass === true) {
					request.session.loggedin = true;
					request.session.username = username;
					request.session.level = level;
					request.session.kodeid = kodeid;
					return response.redirect('/home');
				} else {
					request.flash('infoerror', 'Password salah!');
					return response.redirect('/');
				}
			} else {
				request.flash('infoerror', 'Username tidak ditemukan!');
				return response.redirect('/');
			}			
		});
	} else {
		request.flash('infoerror', 'Silakan masukkan Username dan Password!');
		return response.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/logout', function (req, res) {
	req.session.loggedin = false;
	req.session.username = '';
	req.flash('info', 'Logout Sukses');
	res.redirect('/');
  });
// hapus credential whatsapp
app.post('/hapus-credential',async(req,res)=>{
	try {
		let fdel=fs.unlinkSync(SESSION_FILE_PATH);
		if(fdel){
			return res.json({
				response:{
					sts:'1',
				}
			})	
		}else{
			return res.json({
				response:{
					sts:'0',
				}
			})
		}
		res.redirect('/logout');
	} catch (error) {
		console.log(error);
		return res.json({
			response:{
				sts:'0',
				msg:error,
			}
		})
		res.redirect('/logout');	
	}
	
})
module.exports={app,server,add,client,io,qrcode,fs,SESSION_FILE_PATH,session};


