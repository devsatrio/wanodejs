require('dotenv').config();
const mysql = require('mysql');

// Koneksi lokal SIMRS / Khanza (default local environment)
const connection_khanza = mysql.createPool({
    connectionLimit : parseInt(process.env.DB_KHANZA_CONNECTION_LIMIT, 10) || 10,
    host            : process.env.DB_KHANZA_HOST || 'localhost',
    port            : parseInt(process.env.DB_KHANZA_PORT, 10) || 3306,
    user            : process.env.DB_KHANZA_USER || 'root',
    password        : process.env.DB_KHANZA_PASSWORD !== undefined ? process.env.DB_KHANZA_PASSWORD : '',
    database        : process.env.DB_KHANZA_NAME || 'sik_khanza',
    charset         : 'utf8mb4'
});

module.exports = { connection_khanza };