const http = require('http');
const {connection}=require('./config/db');
// const wasend=require('./sendwhatsapp');
const socketIO=require('socket.io');
var bcrypt = require('bcrypt');
const{Client} =require('whatsapp-web.js');
const qrcode=require('qrcode');
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
const server=http.createServer(app);
const io=socketIO(server);

var flash = require('express-flash');

// ------------------------------------------------------------------
const fs=require('fs');
const { response } = require('express');

const SESSION_FILE_PATH='./wa-session.json';
let sessioncfg;
if(fs.existsSync(SESSION_FILE_PATH)){
	sessioncfg=require(SESSION_FILE_PATH);
}

// socket io
const client=new Client({puppeteer:{headless:true},session:sessioncfg});
io.on('connection',function(socket){
	// socket.emit("message",'Connecting');	
	client.on('qr',(qr)=>{
		console.log('QR RECEIVED');
		// qrcode.generate(qr);
		qrcode.toDataURL(qr,(err,url)=>{
			socket.emit('qr',url);
			socket.emit('msg','QRCode received');
		})
	})
	
	client.on('ready',()=>{
		console.log('Client Ready');
		socket.emit('msg','Whatsapp Ready!');
		socket.emit('qr','/static/img/img.jpg');
		sessioncfg=session;
	})
	client.on('authenticated',(session)=>{
		console.log('authenticated');
		sessioncfg=session;
		fs.writeFile(SESSION_FILE_PATH,JSON.stringify(session),function(err){
			if(err){
				console.error(err);	
			}
		})
	})
});
client.on('message',msg=>{
	if(msg.body=="!ping"){
		msg.reply("pong");
	}
})
client.initialize();



// app.get('/generate',async(req,res)=>{
	
// })	

//--------------------------------------------------------------------
app.use(flash());
app.use(session({
	secret: 'secret',
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
app.use('/static', express.static('public'))

//-----------------------------------------------------------------
app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM tb_users WHERE username = ? limit 1', [username], function(error, results, fields) {
			if (results.length > 0) {
				var level='';
				var userpass='';
				var kodeid='';
				for (index = 0; index < results.length; ++index) {
					level = results[index]['level'];
					userpass = results[index]['password'];
					kodeid = results[index]['id'];
				}
				var comparepass = bcrypt.compareSync(password, userpass);
				if(comparepass===true){
					request.session.loggedin = true;
					request.session.username = username;
					request.session.level = level;
					request.session.kodeid = kodeid;
					response.redirect('/home');
				}else{
					request.flash('infoerror', 'Incorrect Password!');
					response.redirect('/');
				}
			} else {
				request.flash('infoerror', 'Incorrect Username!');
				response.redirect('/');
			}			
			response.end();
		});
	} else {
		request.flash('infoerror', 'Please enter Username and Password!');
		response.redirect('/');
		response.end();
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


