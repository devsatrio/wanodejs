const express = require('express');
var flash = require('express-flash');
var url = require('url');
const fs = require('fs');
const { client, io } = require('../index');

//-----------------------------------------------------------------------------------------------
let app = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
const { parse } = require('path');
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

//-----------------------------------------------------------------------------------------------
app.use(flash());
const { connection } = require('../config/db');

//-----------------------------------------------------------------------------------------------
// ANTI-BAN HELPER FUNCTIONS & REALTIME PROGRESS TRACKER
//-----------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = (minMs = 6000, maxMs = 14000) => Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

function cleanPhoneDigits(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/\D/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    return clean;
}

function formatPhoneNumber(phone) {
    const clean = cleanPhoneDigits(phone);
    if (!clean) return null;
    return clean.endsWith('@c.us') ? clean : clean + '@c.us';
}

function processSpintax(text) {
    if (!text) return '';
    return text.replace(/\{([^{}]+)\}/g, function (match, choices) {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

function personalizeMessage(template, recipientName) {
    let msg = template || '';
    const name = recipientName || '';
    msg = msg.replace(/\{nama\}/gi, name);
    msg = msg.replace(/\{name\}/gi, name);
    msg = processSpintax(msg);
    return msg;
}

// Global state for live broadcast progress
let activeBroadcast = {
    running: false,
    kode: '',
    total: 0,
    current: 0,
    successCount: 0,
    failedCount: 0,
    percentage: 0,
    currentRecipient: '',
    currentPhone: '',
    statusText: '',
    logs: []
};

function emitProgress() {
    if (io) {
        io.emit('broadcast-progress', activeBroadcast);
    }
}

async function runBroadcastQueue(kode, deskripsi, rows) {
    activeBroadcast = {
        running: true,
        kode: kode,
        total: rows.length,
        current: 0,
        successCount: 0,
        failedCount: 0,
        percentage: 0,
        currentRecipient: 'Memulai antrean...',
        currentPhone: '',
        statusText: `Memulai antrean pengiriman (${kode}) untuk ${rows.length} penerima...`,
        logs: []
    };
    emitProgress();

    console.log(`\n======================================================`);
    console.log(`[BROADCAST START] Antrean Broadcast (${kode}) - Total: ${rows.length} Penerima`);
    console.log(`======================================================\n`);

    for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        const rawPhone = item.telp;
        const recipientName = item.penerima || 'Tanpa Nama';
        const cleanDigits = cleanPhoneDigits(rawPhone);

        activeBroadcast.current = i + 1;
        activeBroadcast.percentage = Math.round(((i + 1) / rows.length) * 100);
        activeBroadcast.currentRecipient = recipientName;
        activeBroadcast.currentPhone = cleanDigits || rawPhone;
        activeBroadcast.statusText = `(${i + 1}/${rows.length}) Memproses ${recipientName} (${cleanDigits})...`;
        emitProgress();

        if (!cleanDigits) {
            activeBroadcast.failedCount++;
            const logMsg = `(${i + 1}/${rows.length}) ❌ ${recipientName} (${rawPhone}): Format nomor tidak valid`;
            activeBroadcast.logs.unshift(logMsg);
            activeBroadcast.statusText = logMsg;
            emitProgress();
            console.log(`[BROADCAST SKIP] ` + logMsg);
            continue;
        }

        // Resolve Target ID (Fix for 'No LID for user')
        let targetId = cleanDigits + '@c.us';
        let isRegistered = true;

        try {
            if (client && typeof client.getNumberId === 'function') {
                const numberDetails = await client.getNumberId(cleanDigits);
                if (numberDetails && numberDetails._serialized) {
                    targetId = numberDetails._serialized;
                } else {
                    isRegistered = false;
                }
            }
        } catch (e) {
            console.warn(`[BROADCAST WARN] getNumberId notice: ${e.message}`);
        }

        if (!isRegistered) {
            activeBroadcast.failedCount++;
            const logMsg = `(${i + 1}/${rows.length}) ❌ ${recipientName} (${cleanDigits}): Nomor tidak terdaftar di WhatsApp`;
            activeBroadcast.logs.unshift(logMsg);
            activeBroadcast.statusText = logMsg;
            emitProgress();
            console.log(`[BROADCAST SKIP] ` + logMsg);
            continue;
        }

        // 1. Simulasi Status Mengetik (Typing Presence)
        try {
            activeBroadcast.statusText = `(${i + 1}/${rows.length}) ✍️ Sedang mengetik pesan untuk ${recipientName}...`;
            emitProgress();
            if (client) {
                const chat = await client.getChatById(targetId);
                if (chat && typeof chat.sendStateTyping === 'function') {
                    await chat.sendStateTyping();
                    await sleep(2500); // Simulasi mengetik 2.5 detik
                }
            }
        } catch (e) {
            // Lanjut jika chat typing status error
        }

        // 2. Format Pesan Personal & Spintax
        const finalMessage = personalizeMessage(deskripsi, recipientName);

        // 3. Kirim Pesan WhatsApp
        try {
            await client.sendMessage(targetId, finalMessage);
            activeBroadcast.successCount++;
            const logMsg = `(${i + 1}/${rows.length}) ✅ ${recipientName} (${cleanDigits}): Terkirim`;
            activeBroadcast.logs.unshift(logMsg);
            activeBroadcast.statusText = logMsg;
            emitProgress();
            console.log(`[BROADCAST SUCCESS] ` + logMsg);
        } catch (err) {
            activeBroadcast.failedCount++;
            const logMsg = `(${i + 1}/${rows.length}) ⚠️ ${recipientName} (${cleanDigits}): Gagal (${err.message})`;
            activeBroadcast.logs.unshift(logMsg);
            activeBroadcast.statusText = logMsg;
            emitProgress();
            console.error(`[BROADCAST ERROR] ` + logMsg);
        }

        // 4. Jeda Acak Antar Pesan & Cooldown Batch
        if (i < rows.length - 1) {
            if ((i + 1) % 25 === 0) {
                const batchCooldown = 60000;
                activeBroadcast.statusText = `⏳ Cooldown batch: Istirahat ${batchCooldown / 1000} detik untuk perlindungan akun...`;
                emitProgress();
                console.log(`\n[BATCH COOLDOWN] Istirahat batch selama ${batchCooldown / 1000} detik...\n`);
                await sleep(batchCooldown);
            } else {
                const randomDelay = getRandomDelay(6000, 14000);
                const delaySec = Math.round(randomDelay / 1000);
                activeBroadcast.statusText = `⏳ Jeda aman ${delaySec} detik sebelum kontak berikutnya...`;
                emitProgress();
                console.log(`[DELAY] Menunggu ${delaySec} detik...`);
                await sleep(randomDelay);
            }
        }
    }

    // Update status final di database
    connection.query("UPDATE tb_broadcast SET status = 'terkirim' WHERE kode = ?", [kode], function (err) {
        if (err) console.error('[BROADCAST DB ERROR]', err.message);
    });

    activeBroadcast.running = false;
    activeBroadcast.percentage = 100;
    activeBroadcast.statusText = `🎉 Broadcast (${kode}) selesai! Sukses: ${activeBroadcast.successCount}, Gagal: ${activeBroadcast.failedCount}`;
    emitProgress();

    console.log(`\n======================================================`);
    console.log(`[BROADCAST FINISHED] Broadcast (${kode}) Selesai! Sukses: ${activeBroadcast.successCount}, Gagal: ${activeBroadcast.failedCount}`);
    console.log(`======================================================\n`);
}

// Endpoint untuk cek status progress saat ini
app.get('/active-progress', function (req, res) {
    return res.json(activeBroadcast);
});

// Endpoint untuk menutup / dismiss notifikasi broadcast selesai
app.all('/dismiss-progress', function (req, res) {
    if (!activeBroadcast.running) {
        activeBroadcast = {
            running: false,
            kode: '',
            total: 0,
            current: 0,
            successCount: 0,
            failedCount: 0,
            percentage: 0,
            statusText: '',
            logs: []
        };
        io.emit('broadcast-dismissed');
    }
    return res.json({ success: true });
});

//-----------------------------------------------------------------------------------------------
app.get('/', function (req, res) {
    if (req.session.loggedin) {
        const limit = 10;
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        const countQuery = "SELECT COUNT(*) AS total FROM tb_broadcast";
        connection.query(countQuery, function (error, countResult) {
            if (error) {
                console.error('[BROADCAST COUNT ERROR]', error);
                req.flash('infoerror', 'Gagal memuat data broadcast');
                return res.redirect('/dashboard');
            }

            const total_data = countResult[0] ? countResult[0].total : 0;
            const total_pages = Math.max(1, Math.ceil(total_data / limit));

            if (page > total_pages && total_data > 0) {
                page = total_pages;
            }

            const offset = (page - 1) * limit;
            const prodsQueryPagin = "SELECT tb_broadcast.*, tb_users.nama AS namauser FROM tb_broadcast LEFT JOIN tb_users ON tb_users.id = tb_broadcast.id_user ORDER BY tb_broadcast.id DESC LIMIT ? OFFSET ?";
            
            connection.query(prodsQueryPagin, [limit, offset], function (er, rows) {
                if (er) {
                    console.error('[BROADCAST DATA ERROR]', er);
                    req.flash('infoerror', 'Gagal memuat data broadcast');
                    return res.redirect('/dashboard');
                }

                var jsonResult = {
                    'total_data': total_data,
                    'offset': offset,
                    'limit': limit,
                    'products_page_count': total_pages,
                    'total_pages': total_pages,
                    'page_number': page,
                    'products': rows || []
                };
                res.render('broadcast', jsonResult);
            });
        });
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
    connection.query('INSERT INTO tb_detail_broadcast (kode,penerima,telp) Values (?,?,?)', [kode, nama, telp], function(error, results, fields) {
        if (error) console.error('[ADD PENERIMA ERROR]', error);
        req.flash('info', 'Tambah Penerima Success');
		return res.redirect('/broadcast');
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

    var status = (aksi === 'Kirim') ? 'terkirim' : 'disimpan';

    connection.query('INSERT INTO tb_broadcast (kode,tgl_buat,tgl_kirim,isi,id_user,status,nama) Values (?,?,?,?,?,?,?)', 
    [kode, tgl_buat, tgl_kirim, deskripsi, idadmin, status, nama], function(error, results, fields) {
        if (error) {
            console.error('Error inserting broadcast:', error);
            return res.status(500).json({ error: error.message });
        }
        if (aksi === 'Kirim') {
            connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?", [kode], function(err, rows, fields) {
                if (!err && rows && rows.length > 0) {
                    runBroadcastQueue(kode, deskripsi, rows);
                }
                return res.json({ success: "Broadcast masuk antrean aman", status: 200 });
            });
        } else {
            return res.json({ success: "Updated Successfully", status: 200 });
        }
    }); 
});

//-----------------------------------------------------------------------------------------------
app.post('/hapus-penerima', function (req, res) {
    var kode = req.body.kode;
    connection.query('DELETE FROM tb_detail_broadcast WHERE id=?', [kode], function(error, results, fields) {
        if (error) {
            console.error('[HAPUS PENERIMA ERROR]', error);
            return res.status(500).json({ error: error.message });
        }
        return res.json({ success: true });
    });
});

//-----------------------------------------------------------------------------------------------
app.get('/show/:kode', function (req, res) {
    var kode = req.params.kode;
    if (req.session.loggedin) {
        connection.query('SELECT tb_broadcast.*, tb_users.nama AS namauser FROM tb_broadcast LEFT JOIN tb_users ON tb_users.id = tb_broadcast.id_user WHERE tb_broadcast.kode=?', [kode], function(error, results, fields) {
            if (error) {
                console.error('[SHOW ERROR]', error);
                req.flash('infoerror', 'Gagal memuat detail broadcast');
                return res.redirect('/broadcast');
            }
            return res.render('broadcast_show', { 'data': results || [] });
        });
    } else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
    }
});

//-----------------------------------------------------------------------------------------------
app.get('/edit/:kode', function (req, res) {
    var kode = req.params.kode;
    if (req.session.loggedin) {
        connection.query('SELECT tb_broadcast.*, tb_users.nama AS namauser FROM tb_broadcast LEFT JOIN tb_users ON tb_users.id = tb_broadcast.id_user WHERE tb_broadcast.kode=?', [kode], function(error, results, fields) {
            if (error) {
                console.error('[EDIT ERROR]', error);
                req.flash('infoerror', 'Gagal memuat data edit broadcast');
                return res.redirect('/broadcast');
            }
            return res.render('broadcast_edit', { 'data': results || [] });
        });
    } else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
    }
});

//-----------------------------------------------------------------------------------------------
app.post('/update', function (req, res) {
    var kode = req.body.kode;
    var aksi = req.body.aksi;
    var nama = req.body.nama;
	var tgl_kirim = req.body.tgl;
	var deskripsi = req.body.deskripsi;
    var status = (aksi === 'Kirim') ? 'terkirim' : 'disimpan';

    connection.query('UPDATE tb_broadcast SET tgl_kirim=?, isi=?, status=?, nama=? WHERE kode=?', 
    [tgl_kirim, deskripsi, status, nama, kode], function(error, results, fields) {
        if (error) {
            console.error('Error updating broadcast:', error);
            return res.status(500).json({ error: error.message });
        }
        if (aksi === 'Kirim') {
            connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?", [kode], function(err, rows, fields) {
                if (!err && rows && rows.length > 0) {
                    runBroadcastQueue(kode, deskripsi, rows);
                }
                return res.json({ success: "Broadcast masuk antrean aman", status: 200 });
            });
        } else {
            return res.json({ success: "Updated Successfully", status: 200 });
        }
    }); 
});

//-----------------------------------------------------------------------------------------------
app.post('/send-contoh', async function (req, res) {
	const { nomor, msg } = req.body;
    const finalTelp = formatPhoneNumber(nomor);
    if (!finalTelp) {
        return res.json({ message: 'Nomor telepon tidak valid', code: 400 });
    }
    try {
        const response = await client.sendMessage(finalTelp, String(msg));
        return res.json({ message: response, code: 200 });
    } catch (err) {
        console.error('Direct send error:', err);
        return res.json({ message: err.message || err, code: 201 });
    }
});

app.get('/kirim-broadcast/:kode', function (req, res) {
    var kode = req.params.kode;    
    connection.query("SELECT * FROM tb_broadcast WHERE kode=?", [kode], function(error, hasil, fields) {
        if (error || !hasil || hasil.length === 0) {
            req.flash('infoerror', 'Broadcast tidak ditemukan');
            return res.redirect('/broadcast');
        }
        connection.query("UPDATE tb_broadcast SET status='terkirim' WHERE kode=?", [kode], function(error, results, fields) {
            connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?", [kode], function(err, rows, fields) {
                var deskripsi = hasil[0]['isi'];
                if (!err && rows && rows.length > 0) {
                    runBroadcastQueue(kode, deskripsi, rows);
                }
            });
            req.flash('info', 'Broadcast masuk ke antrean pengiriman aman (jeda acak 6-14 detik & simulasi mengetik).');
            return res.redirect('/broadcast');
        });
    });
});

//-----------------------------------------------------------------------------------------------
app.get('/get-penerima/:kode', function (req, res) {
    connection.query("SELECT * FROM tb_detail_broadcast WHERE kode=?", [req.params.kode], function(err, rows, fields){
        if (err) {
            console.error('[GET PENERIMA ERROR]', err);
            return res.status(500).json([]);
        } 
        return res.json(rows || []);
    });
});

//-----------------------------------------------------------------------------------------------
app.get('/add', function (req, res) {
    if (req.session.loggedin) {
        connection.query("SELECT max(kode) as kodeterbesar FROM tb_broadcast", function(err, rows, fields){
			if (err) {
                console.error('[ADD ERROR]', err);
                req.flash('infoerror', 'Gagal memuat kode broadcast');
                return res.redirect('/broadcast');
            } 

            var finalkode = "BRC0001";
            if (rows && rows.length > 0 && rows[0]['kodeterbesar'] !== null) {
                var kode = rows[0]['kodeterbesar'];
                var kodesubstr = parseInt(kode.substring(3), 10) + 1;
                var newnumber = padLeadingZeros(kodesubstr, 4);
                finalkode = "BRC" + newnumber;
            }
            return res.render('broadcast_create', { 'kode': finalkode });
		});
	} else {
        req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------------------------------------
app.get('/get-data-kontak', function (req, res) {
    var keyword = req.query.q;
    if (keyword) {
        connection.query("SELECT * FROM tb_contact WHERE nama LIKE ? OR no_rm LIKE ?", ['%' + keyword + '%', '%' + keyword + '%'], function(err, rows, fields){
			if (err) {
                console.error('[GET DATA KONTAK ERROR]', err);
                return res.status(500).json([]);
            } 
            return res.json(rows || []);
		});
    } else {
        return res.json([]);
    }
});

//-----------------------------------------------------------------------------------------------
app.get('/get-data-kontak/:kode', function (req, res) {
    connection.query("SELECT * FROM tb_contact WHERE id=?", [req.params.kode], function(err, rows, fields){
        if (err) {
            console.error('[GET DATA KONTAK ID ERROR]', err);
            return res.status(500).json([]);
        } 
        return res.json(rows || []);
    });
});
//-----------------------------------------------------------------------------------------------
app.get('/:kode/hapus', function (req, res) {
    var kode = req.params.kode;
    let sql = "DELETE FROM tb_broadcast WHERE kode=?";
	connection.query(sql, [kode], (err, results) => {
		if (err) console.error('[DELETE BROADCAST ERROR]', err);
        let sqldua = "DELETE FROM tb_detail_broadcast WHERE kode=?";
        connection.query(sqldua, [kode], (err2, results2) => {
            if (err2) console.error('[DELETE DETAIL ERROR]', err2);
            req.flash('info', 'Hapus Data Sukses');
            return res.redirect('/broadcast');
        });
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
        var cari = req.query.search || '';
        var prodsQuery = "SELECT tb_broadcast.*, tb_users.nama AS namauser FROM tb_broadcast LEFT JOIN tb_users ON tb_users.id = tb_broadcast.id_user WHERE tb_broadcast.kode LIKE ? OR tb_broadcast.nama LIKE ? ORDER BY tb_broadcast.id DESC";
        var searchPattern = '%' + cari + '%';
        connection.query(prodsQuery, [searchPattern, searchPattern], function (error, results) {
            if (error) {
                console.error('[BROADCAST SEARCH ERROR]', error);
                req.flash('infoerror', 'Gagal mencari data broadcast');
                return res.redirect('/broadcast');
            }
            return res.render('broadcast_search', { 'data': results || [], 'pencarian': cari });
        });
	} else {
		req.flash('infoerror', 'Maaf, Anda harus login');
		return res.redirect('/');
	}
});

//-----------------------------------------------------------------------------------------------
module.exports = app