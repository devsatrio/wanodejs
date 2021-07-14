const express = require('express');
var flash = require('express-flash');
var url = require('url');

//-----------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//-----------------------------------------------------------------
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'db_wanode'
});

//-----------------------------------------------------------------
var connection_khanza = mysql.createConnection({
	host     : '192.168.3.5',
	user     : 'pelayanan',
	password : '-p0o9i8u7y6t',
	database : 'supersik_asli'
});

//-----------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
        const limit = 200
        const page = req.query.page || 1;
        const offset = (page - 1) * limit
        const prodsQuery = "select * from tb_contact order by id desc limit "+limit+" OFFSET "+offset
        connection.query(prodsQuery, function (error, results, fields) {
            if (error) throw error;
            var jsonResult = {
                'products_page_count':Math.round(results.length/limit),
                'page_number':page,
                'products':results
            }
            res.render('contact',jsonResult);
            res.end();
        })
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
        res.end();
	}
});

//-----------------------------------------------------------------
app.get('/add', function (req, res) {
    if (req.session.loggedin) {
        res.render('contact_create');
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/search', function (req, res) {
    if (req.session.loggedin) {
        var cari = req.query.search;
        var prodsQuery = "select * from tb_contact where nama like '%"+cari+"%' or no_rm like '%"+cari+"%' order by id desc"
        connection.query(prodsQuery, function (error, results, fields) {
            if (error) throw error;
            res.render('contact_search',{'data':results,'pencarian':cari});
            res.end();
        })
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
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
        if(error) throw error;
        req.flash('info', 'Data Berhasil Diperbarui');
        res.redirect('/contact');
        res.end();
    });
});

//-----------------------------------------------------------------
app.get('/:kodecontact/hapus', function (req, res) {
    let sql = "DELETE FROM tb_contact WHERE id="+req.params.kodecontact+"";
	let query = connection.query(sql, (err, results) => {
		if(err) throw err;
		req.flash('info', 'Hapus Data Sukses');
		res.redirect('/contact');
	});
});

//-----------------------------------------------------------------
app.get('/:kodecontact/edit', function (req, res) {
    var kode = req.params.kodecontact;
	if (req.session.loggedin) {
		connection.query('SELECT * FROM tb_contact where id=?', [kode], function(err, rows, fields){
			if(err){
				throw err;
			} 
			res.render('contact_edit', {'datacontact': rows});
		});
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------
app.get('/get-data-pasien', function (req, res) {
    var q = url.parse(req.url, true);
    var keyword = q.query.q;
    if(keyword){
        connection_khanza.query("SELECT * FROM pasien WHERE no_rkm_medis LIKE '%"+keyword+"%' ", function(err, rows, fields){
			if(err){
				throw err;
			} 
            res.json(rows)
		});
    }
});

//-----------------------------------------------------------------
app.get('/get-data-pasien/:norm', function (req, res) {
    connection_khanza.query("SELECT * FROM pasien WHERE no_rkm_medis =?",[req.params.norm], function(err, rows, fields){
        if(err){
            throw err;
        } 
        res.json(rows)
    });
});

//-----------------------------------------------------------------
app.post('/add', function (request, response) {
    var nama = request.body.nama;
	var norm = request.body.norm;
	var telp = request.body.telp;
	var deskripsi = request.body.deskripsi;
    connection.query('INSERT INTO tb_contact (nama,telp,no_rm,deskripsi) Values (?,?,?,?)', [nama, telp, norm, deskripsi], function(error, results, fields) {
        if(error) throw error;
        request.flash('info', 'Data Berhasil Disimpan');
        response.redirect('/contact');
        response.end();
    });
});

module.exports = app