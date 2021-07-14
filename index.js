const http = require('http');
const home = require('./Routes/home');
const user = require('./Routes/user');
const contact = require('./Routes/contact');
const broadcast = require('./Routes/broadcast');
const wabroadcast =require('./Routes/wabroadcash');
var bcrypt = require('bcrypt');

//--------------------------------------------------------------------
var express = require('express');
var mysql = require('mysql');
var session = require('express-session');
var bodyParser = require('body-parser');
var app = express();
var flash = require('express-flash');

//--------------------------------------------------------------------
app.use(flash());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
	res.locals.user = req.session.username || null;
	res.locals.level = req.session.level || null;
	res.locals.kodeid = req.session.kodeid || null;
	next();
  });
//--------------------------------------------------------------------
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'db_wanode'
});

//-----------------------------------------------------------------
app.set('view engine', 'ejs');

//-----------------------------------------------------------------
app.get('/', function (req, res) {
  res.render('index');
});

//-----------------------------------------------------------------
app.use('/static', express.static('public'))

//-----------------------------------------------------------------
app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM tb_users WHERE username = ? limit 1', [username], function(error, results, fields) {
			if (results.length > 0) {
				var level='';
				var userpass='';
				var kodeid='';
				for (index = 0; index < results.length; ++index) {
					level = results[index]['level'];
					userpass = results[index]['password'];
					kodeid = results[index]['id'];
				}
				var comparepass = bcrypt.compareSync(password, userpass);
				if(comparepass===true){
					request.session.loggedin = true;
					request.session.username = username;
					request.session.level = level;
					request.session.kodeid = kodeid;
					response.redirect('/home');
				}else{
					request.flash('infoerror', 'Incorrect Password!');
					response.redirect('/');
				}
			} else {
				request.flash('infoerror', 'Incorrect Username!');
				response.redirect('/');
			}			
			response.end();
		});
	} else {
		request.flash('infoerror', 'Please enter Username and Password!');
		response.redirect('/');
		response.end();
	}
});

//-----------------------------------------------------------------
app.get('/logout', function (req, res) {
	req.session.loggedin = false;
	req.session.username = '';
	req.flash('info', 'Logout Sukses');
	res.redirect('/');
  });

//-----------------------------------------------------------------
app.use('/home',home)

//-----------------------------------------------------------------
app.use('/users',user)

//-----------------------------------------------------------------
app.use('/contact',contact)

//-----------------------------------------------------------------
app.use('/broadcast',broadcast)


//-----------------------------------------------------------------
app.use('/wa',wabroadcast)

//-----------------------------------------------------------------
app.listen(8000, function () {
  console.log('Listening to Port 8000');
});
