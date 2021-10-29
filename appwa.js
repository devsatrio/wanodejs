// var express = require('express');
// var app = express();
const {server,add,app,client,io,qrcode,fs,SESSION_FILE_PATH,session}=require('./index');
const sendwa=require('./sendwhatsapp');
const broadcast = require('./Routes/broadcast');
const home = require('./Routes/home');
const user = require('./Routes/user');
const contact = require('./Routes/contact');

const wabroadcast =require('./Routes/wabroadcash');

app.use(sendwa);
//-----------------------------------------------------------------
app.use('/broadcast',broadcast);
//-----------------------------------------------------------------
app.use('/home',home)

//-----------------------------------------------------------------
app.use('/users',user)

//-----------------------------------------------------------------
app.use('/contact',contact)
//-----------------------------------------------------------------
app.use('/wa',wabroadcast)
app.get('/generate-newapi',function(req,res){
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
})
server.listen(8000, function () {
    console.log('Listening to Port 8000');
  });
