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
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});

function cleanPhoneNumber(phone) {
    if (!phone) return '';
    let clean = String(phone).trim().replace(/\D/g, '');
    if (clean.startsWith('62')) {
        return clean;
    }
    if (clean.startsWith('0')) {
        return '62' + clean.slice(1);
    }
    if (clean.startsWith('8')) {
        return '62' + clean;
    }
    return clean;
}

function validatePhoneNumber(phone) {
    if (!phone) return { isValid: false, reason: 'Nomor telepon kosong', formatted: '', raw: '' };
    let raw = String(phone).trim();
    let clean = raw.replace(/\D/g, '');
    
    if (!clean) {
        return { isValid: false, reason: 'Nomor tidak mengandung digit angka', formatted: '', raw: raw };
    }
    
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    
    if (clean.length < 9) {
        return { isValid: false, reason: `Nomor terlalu pendek (${clean.length} digit, min. 9 digit)`, formatted: clean, raw: raw };
    }
    if (clean.length > 15) {
        return { isValid: false, reason: `Nomor terlalu panjang (${clean.length} digit, maks. 15 digit)`, formatted: clean, raw: raw };
    }
    
    return { isValid: true, reason: 'Valid', formatted: '+' + clean, raw: raw };
}

function escapeVCard(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/[\r\n]+/g, ' ')
        .trim();
}

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
// VALIDASI KONTAK SEBELUM EXPORT VCF
app.get('/validate-vcf', function (req, res) {
    if (!req.session.loggedin) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    connection.query('SELECT id, nama, telp, no_rm, deskripsi FROM tb_contact ORDER BY id ASC', function (err, rows) {
        if (err) {
            console.error('[VALIDATE VCF ERROR]', err);
            return res.status(500).json({ success: false, error: 'Gagal membaca database kontak' });
        }

        const list = rows || [];
        let validList = [];
        let invalidList = [];

        for (let c of list) {
            const v = validatePhoneNumber(c.telp);
            const nama = (c.nama || '').trim();
            if (!nama) {
                invalidList.push({
                    id: c.id,
                    nama: '(Nama Kosong)',
                    telp: c.telp || '-',
                    no_rm: c.no_rm || '-',
                    reason: 'Nama kontak kosong'
                });
            } else if (!v.isValid) {
                invalidList.push({
                    id: c.id,
                    nama: nama,
                    telp: c.telp || '-',
                    no_rm: c.no_rm || '-',
                    reason: v.reason
                });
            } else {
                validList.push({
                    id: c.id,
                    nama: nama,
                    telp: v.formatted,
                    no_rm: c.no_rm || '-',
                    deskripsi: c.deskripsi || ''
                });
            }
        }

        return res.json({
            success: true,
            total: list.length,
            validCount: validList.length,
            invalidCount: invalidList.length,
            invalidList: invalidList.slice(0, 50)
        });
    });
});

//-----------------------------------------------------------------
// EXPORT KONTAK KE FORMAT VCF (.vcf) UNTUK HP
app.get('/export-vcf', function (req, res) {
    if (!req.session.loggedin) {
        req.flash('infoerror', 'Maaf, Anda harus login');
        return res.redirect('/');
    }

    const onlyValid = req.query.only_valid !== '0';

    connection.query('SELECT * FROM tb_contact ORDER BY id ASC', function (err, rows) {
        if (err) {
            console.error('[EXPORT VCF ERROR]', err);
            req.flash('infoerror', 'Gagal mengekspor kontak ke VCF');
            return res.redirect('/contact');
        }

        if (!rows || rows.length === 0) {
            req.flash('infoerror', 'Belum ada data kontak untuk diekspor');
            return res.redirect('/contact');
        }

        let validCount = 0;
        let skippedCount = 0;
        let vcfString = '\uFEFF'; // UTF-8 BOM untuk kompatibilitas penuh Android & iOS

        rows.forEach(function (c) {
            const v = validatePhoneNumber(c.telp);
            const rawNama = (c.nama || '').trim();

            if (onlyValid && (!v.isValid || !rawNama)) {
                skippedCount++;
                return;
            }

            const nama = rawNama || 'Tanpa Nama';
            const norm = (c.no_rm && c.no_rm !== '-' ? ` (${c.no_rm})` : '').trim();
            const fullName = `${nama}${norm}`;
            const escapedFullName = escapeVCard(fullName);
            const telp = v.isValid ? v.formatted : cleanPhoneNumber(c.telp);
            const deskripsi = (c.deskripsi || '').trim();
            const noteContent = (c.no_rm && c.no_rm !== '-') 
                ? `No. RM: ${c.no_rm}${deskripsi ? ' | ' + deskripsi : ''}` 
                : deskripsi;

            vcfString += 'BEGIN:VCARD\r\n';
            vcfString += 'VERSION:3.0\r\n';
            vcfString += `FN;CHARSET=UTF-8:${escapedFullName}\r\n`;
            vcfString += `N;CHARSET=UTF-8:;${escapedFullName};;;\r\n`;
            if (telp) {
                vcfString += `TEL;TYPE=CELL,VOICE:${telp}\r\n`;
            }
            if (noteContent) {
                vcfString += `NOTE;CHARSET=UTF-8:${escapeVCard(noteContent)}\r\n`;
            }
            vcfString += 'PRODID:-//WaNodeJS V1.2//ID\r\n';
            vcfString += 'END:VCARD\r\n';
            validCount++;
        });

        if (validCount === 0) {
            req.flash('infoerror', 'Tidak ada kontak valid yang dapat diekspor ke VCF.');
            return res.redirect('/contact');
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="kontak_wanode_${dateStr}.vcf"`);
        return res.send(vcfString);
    });
});

//-----------------------------------------------------------------
// UNDUH TEMPLATE EXCEL UNTUK IMPORT
app.get('/template-import', function (req, res) {
    const sampleData = [
        { "Nama": "Budi Santoso", "No. Telp": "081234567890", "No. RM": "001234", "Keterangan": "Pasien Rawat Jalan" },
        { "Nama": "Siti Rahma", "No. Telp": "085712345678", "No. RM": "001235", "Keterangan": "Pasien BPJS" },
        { "Nama": "Ahmad Fauzi", "No. Telp": "087812345678", "No. RM": "001236", "Keterangan": "Poli Umum" }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Kontak");
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_import_kontak.xlsx"');
    return res.send(buf);
});

//-----------------------------------------------------------------
// PROSES IMPORT KONTAK (Excel / CSV / VCF / Manual Teks)
app.post('/import', upload.single('file'), function (req, res) {
    if (!req.session.loggedin) {
        req.flash('infoerror', 'Maaf, Anda harus login');
        return res.redirect('/');
    }

    const skipDuplicate = req.body.skip_duplicate === '1' || req.body.skip_duplicate === 'true' || req.body.skip_duplicate === 'on';
    const manualText = req.body.manual_text || '';
    let contactsToInsert = [];

    try {
        // 1. Parse dari file jika diupload
        if (req.file && req.file.buffer) {
            const fileName = (req.file.originalname || '').toLowerCase();

            if (fileName.endsWith('.vcf')) {
                // Parse format VCF
                const vcfContent = req.file.buffer.toString('utf8');
                const vcards = vcfContent.split(/BEGIN:VCARD/i);
                for (let card of vcards) {
                    if (!card.trim()) continue;
                    let nama = '';
                    let telp = '';
                    let norm = '';
                    let deskripsi = '';

                    const fnMatch = card.match(/FN:(.*?)(\r?\n|$)/i);
                    if (fnMatch) nama = fnMatch[1].trim();

                    const telMatch = card.match(/TEL.*?:(.*?)(\r?\n|$)/i);
                    if (telMatch) telp = telMatch[1].trim();

                    const noteMatch = card.match(/NOTE:(.*?)(\r?\n|$)/i);
                    if (noteMatch) deskripsi = noteMatch[1].trim();

                    const rmMatch = nama.match(/\((.*?)\)/);
                    if (rmMatch) {
                        norm = rmMatch[1].replace(/no\.?\s*rm:?/i, '').trim();
                    }

                    nama = nama.trim();
                    telp = cleanPhoneNumber(telp);

                    if (nama || telp) {
                        contactsToInsert.push({
                            nama: nama || 'Tanpa Nama',
                            telp: telp,
                            no_rm: norm || '-',
                            deskripsi: deskripsi || '-'
                        });
                    }
                }
            } else {
                // Parse format Excel (.xlsx, .xls) / CSV
                const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                for (let r of rows) {
                    let nama = r['Nama'] || r['nama'] || r['NAMA'] || r['Name'] || r['name'] || '';
                    let telp = r['No. Telp'] || r['No Telp'] || r['no_telp'] || r['telp'] || r['Telp'] || r['TELP'] || r['Telepon'] || r['Phone'] || r['phone'] || r['HP'] || r['No HP'] || '';
                    let norm = r['No. RM'] || r['No RM'] || r['no_rm'] || r['norm'] || r['NORM'] || r['RM'] || '';
                    let deskripsi = r['Keterangan'] || r['keterangan'] || r['Deskripsi'] || r['deskripsi'] || r['Catatan'] || r['Note'] || '';

                    nama = String(nama).trim();
                    telp = cleanPhoneNumber(telp);
                    norm = String(norm).trim() || '-';
                    deskripsi = String(deskripsi).trim() || '-';

                    if (nama && telp) {
                        contactsToInsert.push({ nama, telp, no_rm: norm, deskripsi });
                    }
                }
            }
        }

        // 2. Parse dari teks manual jika ada
        if (manualText && manualText.trim()) {
            const lines = manualText.split(/[\r\n]+/);
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                let parts = line.includes('\t') ? line.split('\t') : (line.includes(';') ? line.split(';') : line.split(','));
                let nama = (parts[0] || '').trim();
                let telp = cleanPhoneNumber(parts[1] || '');
                let norm = (parts[2] || '').trim() || '-';
                let deskripsi = (parts[3] || '').trim() || '-';

                if (nama && telp) {
                    contactsToInsert.push({ nama, telp, no_rm: norm, deskripsi });
                }
            }
        }

        if (contactsToInsert.length === 0) {
            req.flash('infoerror', 'Tidak ada data kontak valid yang ditemukan. Pastikan kolom Nama dan No. Telp terisi.');
            return res.redirect('/contact');
        }

        // 3. Simpan ke database
        connection.query('SELECT telp FROM tb_contact', function (err, existingRows) {
            if (err) {
                console.error('[IMPORT GET EXISTING ERROR]', err);
            }
            const existingPhones = new Set((existingRows || []).map(r => cleanPhoneNumber(r.telp)).filter(Boolean));

            let finalInserts = [];
            let duplicateCount = 0;

            for (let c of contactsToInsert) {
                if (skipDuplicate && existingPhones.has(c.telp)) {
                    duplicateCount++;
                    continue;
                }
                finalInserts.push([c.nama, c.telp, c.no_rm, c.deskripsi]);
                existingPhones.add(c.telp);
            }

            if (finalInserts.length === 0) {
                req.flash('infoerror', `Semua kontak (${duplicateCount} data) dilewati karena nomor telepon sudah ada di database.`);
                return res.redirect('/contact');
            }

            const insertSql = "INSERT INTO tb_contact (nama, telp, no_rm, deskripsi) VALUES ?";
            connection.query(insertSql, [finalInserts], function (insertErr, result) {
                if (insertErr) {
                    console.error('[IMPORT INSERT ERROR]', insertErr);
                    req.flash('infoerror', 'Gagal menyimpan data import ke database: ' + insertErr.message);
                    return res.redirect('/contact');
                }

                let successMsg = `Berhasil mengimpor ${result.affectedRows} kontak baru!`;
                if (duplicateCount > 0) {
                    successMsg += ` (${duplicateCount} nomor duplikat dilewati).`;
                }
                req.flash('info', successMsg);
                return res.redirect('/contact');
            });
        });

    } catch (err) {
        console.error('[IMPORT GENERAL ERROR]', err);
        req.flash('infoerror', 'Terjadi kesalahan saat memproses import: ' + err.message);
        return res.redirect('/contact');
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