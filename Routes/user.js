const express = require('express');
var bcrypt = require('bcrypt');
var flash = require('express-flash');

//-----------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());


// var connection = mysql.createConnection({
// 	host     : '192.168.3.5',
// 	user     : 'pelayanan',
// 	password : '-p0o9i8u7y6t',
// 	database : 'db_wanode'
//  });
const {connection}=require('../config/db');
//-----------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
		connection.query('SELECT * FROM tb_users', function(err, rows, fields){
			if(err){
				throw err;
			} 
			res.render('user', {'datauser': rows});
		});
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/add', function (req, res) {
	if (req.session.loggedin) {
		res.render('user_create');
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.post('/add', function (request,response) {
	var nama = request.body.nama;
	var username = request.body.user;
	var level = request.body.level;
	var password = request.body.password;
	var kpassword = request.body.kpassword;
	connection.query('SELECT * FROM tb_users WHERE username = ? ', [username], function(error, results, fields) {
		if (results.length > 0) {
			request.flash('info', 'Username sudah dipakai');
			response.redirect('/users/add');
			response.end();
		} else {
			if (password === kpassword) {
				var newpass =encrypt(password);
				connection.query('INSERT INTO tb_users (nama,username,level,password) Values (?,?,?,?)', [nama, username, level, newpass], function(error, results, fields) {
					if(error) throw error;
					request.flash('info', 'Data Berhasil Disimpan');
					response.redirect('/users');
					response.end();
				});
			} else {
				request.flash('info', 'Konfirmasi Password Salah');
				response.redirect('/users/add');
				response.end();
			}
		}			
	});
});

//-----------------------------------------------------------------
app.post('/:userid/edit', function (request,response) {
	var kode = request.params.userid;
	var nama = request.body.nama;
	var username = request.body.user;
	var oldusername = request.body.old_user;
	var level = request.body.level;
	var password = request.body.password;
	var kpassword = request.body.kpassword;
	if(username===oldusername){
		if(password===''){
			connection.query('UPDATE tb_users SET nama=?, username=?, level=? where id=?', [nama, username, level, kode], function(error, results, fields) {
				if(error) throw error;
				request.flash('info', 'Data Berhasil Diperbarui');
				response.redirect('/users');
				response.end();
			});
		}else{
			if (password === kpassword) {
				var newpass =encrypt(password);
				connection.query('UPDATE tb_users SET nama=?, username=?, level=?, password=? where id=?', [nama, username, level, newpass, kode], function(error, results, fields) {
					if(error) throw error;
					request.flash('info', 'Data Berhasil Disimpan');
					response.redirect('/users');
					response.end();
				});
			} else {
				request.flash('info', 'Konfirmasi Password Salah');
				response.redirect('/users/'+kode+'/edit');
				response.end();
			}
		}
	}else{
		connection.query('SELECT * FROM tb_users WHERE username = ? limit 1', [username], function(error, results, fields) {
			if (results.length > 0) {
				request.flash('info', 'Username sudah dipakai');
				response.redirect('/users/'+kode+'/edit');
				response.end();
			} else {
				if(password===''){
					connection.query('UPDATE tb_users SET nama=?, username=?, level=? where id=?', [nama, username, level, kode], function(error, results, fields) {
						if(error) throw error;
						request.flash('info', 'Data Berhasil Diperbarui');
						response.redirect('/users');
						response.end();
					});
				}else{
					if (password === kpassword) {
						var newpass =encrypt(password);
						connection.query('UPDATE tb_users SET nama=?, username=?, level=?, password=? where id=?', [nama, username, level, newpass, kode], function(error, results, fields) {
							if(error) throw error;
							request.flash('info', 'Data Berhasil Disimpan');
							response.redirect('/users');
							response.end();
						});
					} else {
						request.flash('info', 'Konfirmasi Password Salah');
						response.redirect('/users/'+kode+'/edit');
						response.end();
					}
				}
			}			
		});
	}
});

//-----------------------------------------------------------------
app.get('/:userid/hapus', function (req, res) {
	let sql = "DELETE FROM tb_users WHERE id="+req.params.userid+"";
	let query = connection.query(sql, (err, results) => {
		if(err) throw err;
		req.flash('info', 'Hapus Data Sukses');
		res.redirect('/users');
	});
});

//-----------------------------------------------------------------
app.get('/:userid/edit', function (req, res) {
	var kode = req.params.userid;
	if (req.session.loggedin) {
		connection.query('SELECT * FROM tb_users where id=?', [kode], function(err, rows, fields){
			if(err){
				throw err;
			} 
			res.render('user_edit', {'datauser': rows});
		});
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------
function encrypt(text) {
	var salt = bcrypt.genSaltSync(10);
	var finalkey = bcrypt.hashSync(text, salt);
	return finalkey;
}
module.exports = app