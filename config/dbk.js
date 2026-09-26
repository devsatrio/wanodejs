const mysql = require('mysql');

// Koneksi lokal SIMRS / Khanza (default local environment)
const connection_khanza = mysql.createPool({
    connectionLimit : 10,
    host            : 'localhost',
    user            : 'root',
    password        : '',
    database        : 'sik_khanza',
    charset         : 'utf8mb4'
});

module.exports = { connection_khanza };