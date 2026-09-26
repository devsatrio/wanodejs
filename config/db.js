const mysql = require('mysql');

const connection = mysql.createPool({
	connectionLimit : 10,
	host            : 'localhost',
	user            : 'root',
	password        : '',
	database        : 'db_wanode',
	charset         : 'utf8mb4'
});

module.exports = { connection };