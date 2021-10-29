const sequelize=require("sequelize");
const mysql = require('mysql');

// const db=new sequelize("db_wanode",'root','',{
//     dialect:'mysql'
// });

// db.sync({});
// const connection = mysql.createConnection({
// 	host     : '192.168.3.5',
//     user     : 'pelayanan',
//     password : '-p0o9i8u7y6t',
// 	database : 'db_wanode'
// });

const connection = mysql.createConnection({
	host     : 'localhost',
    user     : 'root',
    password : '',
	database : 'db_wanode'
});
module.exports={connection};