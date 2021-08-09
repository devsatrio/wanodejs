const sequelize=require("sequelize");
const mysql = require('mysql');
// const db=new sequelize("sik_khanza","root","",{
//     dialect:'mysql'
// });
// db.sync({});
const connection_khanza = mysql.createConnection({
    host     : '192.168.3.5',
    user     : 'pelayanan',
    password : '-p0o9i8u7y6t',
    database : 'supersik_asli'
});
module.exports={connection_khanza};