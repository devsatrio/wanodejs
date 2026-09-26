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
app.get('/generate-newapi', function (req, res) {
	res.json({ message: 'WhatsApp Engine is running' });
});
server.listen(8000, function () {
    console.log('Listening to Port 8000');
  });
