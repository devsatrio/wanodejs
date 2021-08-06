const express = require('express');
var flash = require('express-flash');
var url = require('url');
const { Client } = require('whatsapp-web.js');
const fs = require('fs');

//-----------------------------------------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//-----------------------------------------------------------------------------------------------
app.use(flash());

var connection = mysql.createConnection({
   host     : '192.168.3.5',
   user     : 'pelayanan',
   password : '-p0o9i8u7y6t',
   database : 'db_wanode'
});

//-----------------------------------------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
        const limit = 100
        const page = req.query.page || 1;
        const offset = (page - 1) * limit
        const prodsQuery = "select tb_broadcast.*,tb_users.nama as namauser from tb_broadcast left join tb_users on tb_users.id = tb_broadcast.id_user order by tb_broadcast.id desc limit "+limit+" OFFSET "+offset
        connection.query(prodsQuery, function (error, results, fields) {
            if (error) throw error;
            var jsonResult = {
                'products_page_count':Math.round(results.length/limit),
                'page_number':page,
                'products':results
            }
            res.render('broadcast',jsonResult);
            res.end();
        })
	} else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------------------------------------
app.post('/add-penerima', function (req, res) {
    var nama = req.body.nama;
	var telp = req.body.telp;
	var kode = req.body.kode;
    connection.query('INSERT INTO tb_detail_broadcast (kode,penerima,telp) Values (?,?,?)', [kode,nama, telp], function(error, results, fields) {
        req.flash('info', 'Kirim Broadcast Success');
		res.redirect('/broadcast');
    });
});

//-----------------------------------------------------------------------------------------------
app.post('/kirim', function (req, res) {
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate();
    var year = dateObj.getUTCFullYear();

    var kode = req.body.kode;
    var aksi = req.body.aksi;
    var nama = req.body.nama;
	var tgl_kirim = req.body.tgl;
    var tgl_buat = year + "-" + month + "-" + day;
	var deskripsi = req.body.deskripsi;
    var idadmin = req.session.kodeid;

    if(aksi==='Kirim'){
        var status = 'terkirim';
    }else{
        var status = 'disimpan';
    }
    connection.query('INSERT INTO tb_broadcast (kode,tgl_buat,tgl_kirim,isi,id_user,status,nama) Values (?,?,?,?,?,?,?)', 
    [kode,tgl_buat, tgl_kirim,deskripsi,idadmin,status,nama], function(error, results, fields) {
        if(aksi==='Kirim'){
            connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?",[kode] ,function(err, rows, fields){
                // let SESSION_FILE_PATH = './session.json';
                // let sessionCfg;
                // if (fs.existsSync(SESSION_FILE_PATH)) {
                //     sessionCfg = require(SESSION_FILE_PATH);
                // }
                let client = new Client({ puppeteer: { headless: false }});
                client.initialize();
                client.on('qr', (qr) => {
                    console.log('QR RECEIVED', qr);
                });
                client.on('authenticated', (session) => {
                    console.log('AUTHENTICATED', session);
                    // sessionCfg=session;
                    // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
                    //     if (err) {
                    //         console.error(err);
                    //     }
                    // });
                });
                client.on('auth_failure', msg => {
                    console.error('AUTHENTICATION FAILURE', msg);
                });
                client.on('ready', () => {
                    for(var i=0; i<rows.length; i++) {
                        var telp = rows[i]['telp'];
                        var newtelp = telp.substring(1);
                        var finaltelp = '62'+newtelp+'@c.us';
                        client.sendMessage(finaltelp, deskripsi).then((response) => {});
                    }
                });
                res.end('{"success" : "Updated Successfully", "status" : 200}');
            });
        }else{
            res.end('{"success" : "Updated Successfully", "status" : 200}');
        }
    }); 
});

//-----------------------------------------------------------------------------------------------
app.post('/hapus-penerima', function (req, res) {
    var kode = req.body.kode;
    connection.query('DELETE From tb_detail_broadcast where id=?', [kode], function(error, results, fields) {
        res.end();
    });
});

//-----------------------------------------------------------------------------------------------
app.get('/show/:kode', function (req, res) {
    var kode = req.params.kode;
    if (req.session.loggedin) {
        connection.query('select tb_broadcast.*, tb_users.nama as namauser From tb_broadcast left join tb_users on tb_users.id = tb_broadcast.id_user where tb_broadcast.kode=?', [kode], function(error, results, fields) {
            res.render('broadcast_show',{'data':results});
            res.end();
        });
    }else{
        req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
    }
    
});

//-----------------------------------------------------------------------------------------------
app.get('/edit/:kode', function (req, res) {
    var kode = req.params.kode;
    if (req.session.loggedin) {
        connection.query('select tb_broadcast.*, tb_users.nama as namauser From tb_broadcast left join tb_users on tb_users.id = tb_broadcast.id_user where tb_broadcast.kode=?', [kode], function(error, results, fields) {
            res.render('broadcast_edit',{'data':results});
            res.end();
        });
    }else{
        req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
    }
});

//-----------------------------------------------------------------------------------------------
app.post('/update', function (req, res) {
    var kode = req.body.kode;
    var aksi = req.body.aksi;
    var nama = req.body.nama;
	var tgl_kirim = req.body.tgl;
	var deskripsi = req.body.deskripsi;
    var status = 'terkirim';

    connection.query('Update tb_broadcast set tgl_kirim=?,isi=?,status=?,nama=? where kode=?', 
    [tgl_kirim,deskripsi,status,nama,kode], function(error, results, fields) {
        if(aksi==='Kirim'){
            connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?",[kode] ,function(err, rows, fields){
                let client = new Client({ puppeteer: { headless: false }});
                client.initialize();
                client.on('qr', (qr) => {
                    console.log('QR RECEIVED', qr);
                });
                client.on('authenticated', (session) => {
                    console.log('AUTHENTICATED', session);
                });
                client.on('auth_failure', msg => {
                    console.error('AUTHENTICATION FAILURE', msg);
                });
                client.on('ready', () => {
                    for(var i=0; i<rows.length; i++) {
                        var telp = rows[i]['telp'];
                        var newtelp = telp.substring(1);
                        var finaltelp = '62'+newtelp+'@c.us';
                        client.sendMessage(finaltelp, deskripsi).then((response) => {});
                    }
                });
                res.end('{"success" : "Updated Successfully", "status" : 200}');
            });
        }else{
            res.end('{"success" : "Updated Successfully", "status" : 200}');
        }
    }); 
});

//-----------------------------------------------------------------------------------------------
app.get('/kirim-broadcast/:kode', function (req, res) {
    var kode = req.params.kode;
    connection.query("select * from tb_broadcast where kode='"+kode+"'", function(error, hasil, fields) {
        connection.query("Update tb_broadcast set status='terkirim' where kode='"+kode+"'", function(error, results, fields) {
            connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?",[kode] ,function(err, rows, fields){
                var deskripsi = hasil[0]['isi'];
                // let SESSION_FILE_PATH = './session.json';
                // let sessionCfg;
                // if (fs.existsSync(SESSION_FILE_PATH)) {
                //     sessionCfg = require(SESSION_FILE_PATH);
                // }
                let client = new Client({ puppeteer: { headless: false }});
                client.initialize();
                client.on('qr', (qr) => {
                    console.log('QR RECEIVED', qr);
                });
                client.on('authenticated', (session) => {
                    console.log('AUTHENTICATED', session);
                    // sessionCfg=session;
                    // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
                    //     if (err) {
                    //         console.error(err);
                    //     }
                    // });
                });
                client.on('auth_failure', msg => {
                    // const path = './session.json'
                    // try {
                    // fs.unlinkSync(path)
                    // } catch(err) {
                    // console.error(err)
                    // }
                    console.error('AUTHENTICATION FAILURE', msg);
                });
                client.on('ready', () => {
                    for(var i=0; i<rows.length; i++) {
                        var telp = rows[i]['telp'];
                        var newtelp = telp.substring(1);
                        var finaltelp = '62'+newtelp+'@c.us';
                        client.sendMessage(finaltelp, deskripsi).then((response) => {});
                    }
                });
                req.flash('infoerror', 'Pesan dikirim');
                res.redirect('/broadcast');
            });
        });
    });
});

//-----------------------------------------------------------------------------------------------
app.get('/get-penerima/:kode', function (req, res) {
    connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?",[req.params.kode], function(err, rows, fields){
        if(err){
            throw err;
        } 
        res.json(rows)
    });
});

//-----------------------------------------------------------------------------------------------
app.get('/add', function (req, res) {
    if (req.session.loggedin) {
        connection.query("SELECT max(kode) as kodeterbesar FROM tb_broadcast", function(err, rows, fields){
			if(err){
				throw err;
			} 

            if(rows.length > 0){
                for (index = 0; index < rows.length; ++index) {
                    if(rows[index]['kodeterbesar']===null){
                        var finalkode = "BRC0001";
                    }else{
                        var kode = rows[index]['kodeterbesar'];
                        var kodesubstr = parseInt(kode.substring(3)) + 1;
                        var newnumber = padLeadingZeros(kodesubstr, 4);
                        var finalkode = "BRC"+newnumber;
                    }
               }
            }else{
                var finalkode = "BRC0001";
            }
            res.render('broadcast_create',{'kode':finalkode});
		});
	} else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------------------------------------
app.get('/get-data-kontak', function (req, res) {
    var keyword =req.query.q;
    if(keyword){
        connection.query("SELECT * FROM tb_contact WHERE nama LIKE '%"+keyword+"%' or no_rm LIKE '%"+keyword+"%' ", function(err, rows, fields){
			if(err){
				throw err;
			} 
            res.json(rows)
		});
    }
});

//-----------------------------------------------------------------------------------------------
app.get('/get-data-kontak/:kode', function (req, res) {
    connection.query("SELECT * FROM tb_contact WHERE id=?",[req.params.kode], function(err, rows, fields){
        if(err){
            throw err;
        } 
        res.json(rows)
    });
});
//-----------------------------------------------------------------------------------------------
app.get('/:kode/hapus', function (req, res) {
    let sql = "DELETE FROM tb_broadcast WHERE kode='"+req.params.kode+"'";
	connection.query(sql, (err, results) => {
		if(err) throw err;
	});

    let sqldua = "DELETE FROM tb_detail_broadcast WHERE kode='"+req.params.kode+"'";
	connection.query(sqldua, (err, results) => {
		if(err) throw err;
		req.flash('info', 'Hapus Data Sukses');
		res.redirect('/broadcast');
	});
});

//-----------------------------------------------------------------------------------------------
function padLeadingZeros(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

//-----------------------------------------------------------------------------------------------
app.get('/search', function (req, res) {
    if (req.session.loggedin) {
        var cari = req.query.search;
        var prodsQuery = "select * from tb_broadcast where kode like '%"+cari+"%' or nama like '%"+cari+"%' order by id desc"
        connection.query(prodsQuery, function (error, results, fields) {
            if (error) throw error;
            res.render('broadcast_search',{'data':results,'pencarian':cari});
            res.end();
        })
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		res.redirect('/');
	}
});

//-----------------------------------------------------------------------------------------------
module.exports = app