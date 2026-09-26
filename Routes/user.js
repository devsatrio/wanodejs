const express = require('express');
var bcrypt = require('bcrypt');
var flash = require('express-flash');

//-----------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

const {connection}=require('../config/db');

//-----------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
        const limit = 10;
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        const countQuery = "SELECT COUNT(*) AS total FROM tb_users";
        connection.query(countQuery, function (error, countResult) {
            if (error) {
                console.error('[USER LIST COUNT ERROR]', error);
                req.flash('infoerror', 'Gagal memuat data user');
                return res.redirect('/home');
            }

            const total_data = countResult[0] ? countResult[0].total : 0;
            const total_pages = Math.max(1, Math.ceil(total_data / limit));

            if (page > total_pages && total_data > 0) {
                page = total_pages;
            }

            const offset = (page - 1) * limit;
            const prodsQueryPagin = "SELECT * FROM tb_users ORDER BY id DESC LIMIT ? OFFSET ?";

            connection.query(prodsQueryPagin, [limit, offset], function (er, rows) {
                if (er) {
                    console.error('[USER LIST DATA ERROR]', er);
                    req.flash('infoerror', 'Gagal memuat data user');
                    return res.redirect('/home');
                }

                var jsonResult = {
                    'total_data': total_data,
                    'offset': offset,
                    'limit': limit,
                    'products_page_count': total_pages,
                    'total_pages': total_pages,
                    'page_number': page,
                    'datauser': rows || []
                };
                return res.render('user', jsonResult);
            });
        });
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/search', function (req, res) {
    if (req.session.loggedin) {
        var cari = req.query.search || '';
        var prodsQuery = "SELECT * FROM tb_users WHERE nama LIKE ? OR username LIKE ? OR level LIKE ? ORDER BY id DESC";
        var searchPattern = '%' + cari + '%';
        connection.query(prodsQuery, [searchPattern, searchPattern, searchPattern], function (error, results) {
            if (error) {
                console.error('[USER SEARCH ERROR]', error);
                req.flash('infoerror', 'Gagal mencari data user');
                return res.redirect('/users');
            }
            return res.render('user_search', { 'datauser': results || [], 'pencarian': cari });
        });
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/add', function (req, res) {
	if (req.session.loggedin) {
		return res.render('user_create');
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
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
		if (results && results.length > 0) {
			request.flash('info', 'Username sudah dipakai');
			return response.redirect('/users/add');
		} else {
			if (password === kpassword) {
				var newpass = encrypt(password);
				connection.query('INSERT INTO tb_users (nama,username,level,password) Values (?,?,?,?)', [nama, username, level, newpass], function(error, results, fields) {
					if(error) console.error('[USER INSERT ERROR]', error);
					request.flash('info', 'Data Berhasil Disimpan');
					return response.redirect('/users');
				});
			} else {
				request.flash('info', 'Konfirmasi Password Salah');
				return response.redirect('/users/add');
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
				if(error) console.error('[USER UPDATE ERROR]', error);
				request.flash('info', 'Data Berhasil Diperbarui');
				return response.redirect('/users');
			});
		}else{
			if (password === kpassword) {
				var newpass = encrypt(password);
				connection.query('UPDATE tb_users SET nama=?, username=?, level=?, password=? where id=?', [nama, username, level, newpass, kode], function(error, results, fields) {
					if(error) console.error('[USER UPDATE ERROR]', error);
					request.flash('info', 'Data Berhasil Disimpan');
					return response.redirect('/users');
				});
			} else {
				request.flash('info', 'Konfirmasi Password Salah');
				return response.redirect('/users/'+kode+'/edit');
			}
		}
	}else{
		connection.query('SELECT * FROM tb_users WHERE username = ? limit 1', [username], function(error, results, fields) {
			if (results && results.length > 0) {
				request.flash('info', 'Username sudah dipakai');
				return response.redirect('/users/'+kode+'/edit');
			} else {
				if(password===''){
					connection.query('UPDATE tb_users SET nama=?, username=?, level=? where id=?', [nama, username, level, kode], function(error, results, fields) {
						if(error) console.error('[USER UPDATE ERROR]', error);
						request.flash('info', 'Data Berhasil Diperbarui');
						return response.redirect('/users');
					});
				}else{
					if (password === kpassword) {
						var newpass = encrypt(password);
						connection.query('UPDATE tb_users SET nama=?, username=?, level=?, password=? where id=?', [nama, username, level, newpass, kode], function(error, results, fields) {
							if(error) console.error('[USER UPDATE ERROR]', error);
							request.flash('info', 'Data Berhasil Disimpan');
							return response.redirect('/users');
						});
					} else {
						request.flash('info', 'Konfirmasi Password Salah');
						return response.redirect('/users/'+kode+'/edit');
					}
				}
			}			
		});
	}
});

//-----------------------------------------------------------------
app.get('/:userid/hapus', function (req, res) {
	let sql = "DELETE FROM tb_users WHERE id=?";
	connection.query(sql, [req.params.userid], (err, results) => {
		if(err) console.error('[USER DELETE ERROR]', err);
		req.flash('info', 'Hapus Data Sukses');
		return res.redirect('/users');
	});
});

//-----------------------------------------------------------------
app.get('/:userid/edit', function (req, res) {
	var kode = req.params.userid;
	if (req.session.loggedin) {
		connection.query('SELECT * FROM tb_users where id=?', [kode], function(err, rows, fields){
			if(err){
				console.error('[USER GET EDIT ERROR]', err);
				req.flash('infoerror', 'Gagal memuat data user');
				return res.redirect('/users');
			} 
			return res.render('user_edit', {'datauser': rows || []});
		});
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
function encrypt(text) {
	var salt = bcrypt.genSaltSync(10);
	var finalkey = bcrypt.hashSync(text, salt);
	return finalkey;
}
module.exports = app;