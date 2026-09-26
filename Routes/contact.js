const express = require('express');
var flash = require('express-flash');
var url = require('url');
const dbk=require('../config/dbk');

//-----------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//-----------------------------------------------------------------
// var connection = mysql.createConnection({
// 	host     : 'localhost',
// 	user     : 'root',
// 	password : '',
// 	database : 'db_wanode'
// });

//-----------------------------------------------------------------
// var connection_khanza = mysql.createConnection({
// 	host     : '192.168.3.5',
// 	user     : 'pelayanan',
// 	password : '-p0o9i8u7y6t',
// 	database : 'supersik_asli'
// });
// var connection_khanza = mysql.createConnection({
//     host     : '192.168.3.5',
//     user     : 'pelayanan',
//     password : '-p0o9i8u7y6t',
//     database : 'supersik_asli'
// });
// var connection = mysql.createConnection({
//    host     : '192.168.3.5',
//    user     : 'pelayanan',
//    password : '-p0o9i8u7y6t',
//    database : 'db_wanode'
// });
const {connection}=require('../config/db');
const {connection_khanza}=require('../config/dbk');

//-----------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
        const limit = 200;
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * limit;
        const prodsQuery = "SELECT COUNT(*) AS total FROM tb_contact";
        connection.query(prodsQuery, function (error, countResult) {
            if(error){
                console.error('[CONTACT COUNT ERROR]', error);
                req.flash('infoerror', 'Gagal memuat kontak');
                return res.redirect('/dashboard');
            }
            const total_data = countResult[0] ? countResult[0].total : 0;
            const total_pages = Math.max(1, Math.ceil(total_data / limit));
            const prodsQueryPagin = "SELECT * FROM tb_contact ORDER BY id DESC LIMIT ? OFFSET ?";
            connection.query(prodsQueryPagin, [limit, offset], function (er, resu) {
                if (er) {
                    console.error('[CONTACT DATA ERROR]', er);
                    req.flash('infoerror', 'Gagal memuat data kontak');
                    return res.redirect('/dashboard');
                }
                var jsonResult = {
                    'total_data': total_data,
                    'products_page_count': total_pages,
                    'total_pages': total_pages,
                    'page_number': page,
                    'offset': offset,
                    'products': resu || []
                };
                return res.render('contact', jsonResult);
            });
        });
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/add', function (req, res) {
    if (req.session.loggedin) {
        return res.render('contact_create');
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/search', function (req, res) {
    if (req.session.loggedin) {
        var cari = req.query.search || '';
        var prodsQuery = "SELECT * FROM tb_contact WHERE nama LIKE ? OR no_rm LIKE ? ORDER BY id DESC";
        var searchPattern = '%' + cari + '%';
        connection.query(prodsQuery, [searchPattern, searchPattern], function (error, results) {
            if (error) {
                console.error('[CONTACT SEARCH ERROR]', error);
                req.flash('infoerror', 'Gagal mencari kontak');
                return res.redirect('/contact');
            }
            return res.render('contact_search', { 'data': results || [], 'pencarian': cari });
        });
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.post('/update', function (req, res) {
	var kode = req.body.kode;
	var nama = req.body.nama;
	var telp = req.body.telp;
	var norm = req.body.norm;
	var deskripsi = req.body.deskripsi;
    connection.query('UPDATE tb_contact SET nama=?, telp=?, no_rm=?, deskripsi=? where id=?', [nama, telp, norm, deskripsi, kode], function(error, results, fields) {
        if(error) console.error('[CONTACT UPDATE ERROR]', error);
        if(norm!='' && norm!=null && norm!='-'){
            connection_khanza.query('update pasien set no_tlp=? where no_rkm_medis=?', [telp, norm], function(error, results, fields) {
                if(error) console.error('Khanza update notice:', error.message);
                req.flash('info', 'Data Berhasil Diperbarui');
                return res.redirect('/contact');
            });
        }else{
            req.flash('info', 'Data Berhasil Diperbarui');
            return res.redirect('/contact');
        }
    });
});

//-----------------------------------------------------------------
app.get('/:kodecontact/hapus', function (req, res) {
    let sql = "DELETE FROM tb_contact WHERE id=?";
	connection.query(sql, [req.params.kodecontact], (err, results) => {
		if(err) console.error('[CONTACT DELETE ERROR]', err);
		req.flash('info', 'Hapus Data Sukses');
		return res.redirect('/contact');
	});
});

//-----------------------------------------------------------------
app.get('/:kodecontact/edit', function (req, res) {
    var kode = req.params.kodecontact;
	if (req.session.loggedin) {
		connection.query('SELECT * FROM tb_contact where id=?', [kode], function(err, rows, fields){
			if(err){
				console.error('[CONTACT EDIT ERROR]', err);
				req.flash('infoerror', 'Gagal memuat data kontak');
				return res.redirect('/contact');
			} 
			return res.render('contact_edit', {'datacontact': rows || []});
		});
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/get-data-pasien', function (req, res) {
    var q = url.parse(req.url, true);
    var keyword = q.query.q;
    if(keyword){
        connection_khanza.query("SELECT * FROM pasien WHERE no_rkm_medis LIKE '%"+keyword+"%' ", function(err, rows, fields){
			if(err){
				console.error('Khanza search notice:', err.message);
				return res.json([]);
			} 
            return res.json(rows || []);
		});
    } else {
        return res.json([]);
    }
});

//-----------------------------------------------------------------
app.get('/get-data-pasien/:norm', function (req, res) {
    connection_khanza.query("SELECT * FROM pasien WHERE no_rkm_medis =?",[req.params.norm], function(err, rows, fields){
        if(err){
            console.error('Khanza get patient notice:', err.message);
            return res.json([]);
        } 
        return res.json(rows || []);
    });
});

//-----------------------------------------------------------------
app.post('/add', function (request, response) {
    var nama = request.body.nama;
	var norm = request.body.norm;
	var telp = request.body.telp;
	var deskripsi = request.body.deskripsi;
    connection.query('INSERT INTO tb_contact (nama,telp,no_rm,deskripsi) Values (?,?,?,?)', [nama, telp, norm, deskripsi], function(error, results, fields) {
        if(error) console.error('[CONTACT INSERT ERROR]', error);
        if(norm!='' && norm!=null && norm!='-'){
            connection_khanza.query('update pasien set no_tlp=? where no_rkm_medis=?', [telp, norm], function(error, results, fields) {
                if(error) console.error('Khanza insert update notice:', error.message);
                request.flash('info', 'Data Berhasil Disimpan');
                return response.redirect('/contact');
            });
        }else{
            request.flash('info', 'Data Berhasil Disimpan');
            return response.redirect('/contact');
        }
    });
});

module.exports = app