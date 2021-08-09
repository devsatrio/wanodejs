var express = require('express');
const {client}=require('./index');
var app = express();
// --------------------------------------------------

app.post('/send-contoh',function(req,res){
	const{nomor,msg}=req.body;	
	client.sendMessage(nomor,msg).then(response=>{
				res.json({
					message:response,
					code:200,
				})
			}).catch(err=>{
				res.json({
					message:err,
					code:201,
				})
			});

	// console.log(add(2,2));
	
})
module.exports=app;