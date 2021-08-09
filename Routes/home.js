const express = require('express');
var bcrypt = require('bcrypt');
var flash = require('express-flash');

//-----------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
const { request } = require('express');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//--------------------------------------------------------------------
// var connection = mysql.createConnection({
// 	host     : 'localhost',
// 	user     : 'root',
// 	password : '',
// 	database : 'db_wanode'
//  });
const {connection}=require('../config/db');
//-----------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
        res.render('home');
	} else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
	res.end();
});

//-----------------------------------------------------------------
app.get('/edit-profile', function (req, res) {
    if (req.session.loggedin) {
		connection.query('SELECT * FROM tb_users where id=?', [res.locals.kodeid], function(err, rows, fields){
			if(err){
				throw err;
			} 
			res.render('edit_profile', {'datauser': rows});
			res.end();
		});
	} else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
		res.end();
	
	}
});

//-----------------------------------------------------------------
app.get('/getdata', function (req, res) {
	connection.query('SELECT Count(*) as total FROM tb_broadcast', function(err, row, fields){
		connection.query('SELECT Count(*) as total FROM tb_users', function(err, rows, fields){
			connection.query('SELECT Count(*) as total FROM tb_contact', function(err, rowss, fields){
				connection.query("SELECT Count(*) as total FROM tb_broadcast where status='disimpan'", function(err, rowsss, fields){
				var jsonResult = {
					'broadcast':row[0]['total'],
					'users':rows[0]['total'],
					'contact':rowss[0]['total'],
					'broadcast_pending':rowsss[0]['total']
				}
				res.json(jsonResult)
				});
			});
		});
	});
});

//-----------------------------------------------------------------
app.post('/edit-profile', function (request, response) {
	var kodeuser = request.body.kodeuser;
	var nama = request.body.nama;
	var username = request.body.user;
	var oldusername = request.body.old_user;
	var level = request.body.level;
	var password = request.body.password;
	var kpassword = request.body.kpassword;
	if(username===oldusername){
		if(password===''){
			connection.query('UPDATE tb_users SET nama=?, username=? where id=?', [nama, username, kodeuser], function(error, results, fields) {
				if(error) throw error;
				request.flash('info', 'Profile Berhasil Diperbarui');
				response.redirect('/home');
				response.end();
			});
		}else{
			if (password === kpassword) {
				var newpass =encrypt(password);
				connection.query('UPDATE tb_users SET nama=?, username=?, password=? where id=?', [nama, username, newpass, kodeuser], function(error, results, fields) {
					if(error) throw error;
					request.flash('info', 'Profile Berhasil Disimpan');
					response.redirect('/home');
					response.end();
				});
			} else {
				request.flash('info', 'Konfirmasi Password Salah');
				response.redirect('/home/edit-profile');
				response.end();
			}
		}
	}else{
		connection.query('SELECT * FROM tb_users WHERE username = ? limit 1', [username], function(error, results, fields) {
			if (results.length > 0) {
				request.flash('info', 'Username sudah dipakai');
				response.redirect('/home/edit-profile');
				response.end();
			} else {
				if(password===''){
					connection.query('UPDATE tb_users SET nama=?, username=? where id=?', [nama, username, kodeuser], function(error, results, fields) {
						if(error) throw error;
						request.flash('info', 'Profile Berhasil Diperbarui');
						response.redirect('/home');
						response.end();
					});
				}else{
					if (password === kpassword) {
						var newpass =encrypt(password);
						connection.query('UPDATE tb_users SET nama=?, username=?, password=? where id=?', [nama, username, newpass, kodeuser], function(error, results, fields) {
							if(error) throw error;
							request.flash('info', 'Profile Berhasil Disimpan');
							response.redirect('/home');
							response.end();
						});
					} else {
						request.flash('info', 'Konfirmasi Password Salah');
						response.redirect('/home/edit-profile');
						response.end();
					}
				}
			}			
		});
	}
});

//-----------------------------------------------------------------
function encrypt(text) {
	var salt = bcrypt.genSaltSync(10);
	// hash password dengan salt 
	var finalkey = bcrypt.hashSync(text, salt);
	return finalkey;
}
module.exports = app