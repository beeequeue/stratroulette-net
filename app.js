"use strict";
// TODO: Make all of gamemode selectors clickable
var express      = require('express'),
    path         = require('path'),
    favicon      = require('serve-favicon'),
    logger       = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser   = require('body-parser'),
    session      = require('express-session'),
    minify       = require('express-minify'),
    compress     = require('compression'),
    fs           = require('fs'),
    mongo        = require('mongodb').MongoClient;

var databaseString = "mongodb://{host}:{port}/{database}"
    .replace("{host}", process.env.DBHOST)
    .replace("{port}", process.env.DBPORT)
    .replace("{database}", process.env.DBNAME);

mongo.connect(databaseString, function (err, db) {
    if (!err) {
        console.log('Global DB connected');

        /*
         *  Globals are bad, but I'm having troubles getting
         *  cross-script database access to work in any other way.
         *  I'm open to pull requests that fix it!
         */

        global.db = db;
        global.db.strats = db.collection('strats');
        global.db.submissions = db.collection('submissions');

        resetDatabase();
    }
    else {
        console.error(err);
        throw new Error("DatabaseConnectionException");
    }
});

var routes = require('./routes/index');
var getPage = require('./routes/get');

var app = express();

//region Express setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');                                     // Set up jade view engine

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));    // Website icon
app.use(logger('dev'));                                             // Bad logger TODO: Add better logging (Winston)
app.use(compress({level: 4}));                                      // Enable gzip
app.use(minify());                                                  // Enable minifying
app.use(express.static(path.join(__dirname, 'public')));            // Serve files
app.use(session({secret: process.env.SECRET}));                          // Enable sessions
app.use(bodyParser.json());                                         // Enable parser
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());                                            // Enable cookies
//endregion

// Routes
app.use('/', routes);
app.use('/get', getPage);

//region Error catching
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res) {
        console.error(err);

        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error:   err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res) {
    console.error(err);

    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error:   {}
    });
});
//endregion

function resetDatabase() {
    fs.readFile('newStrats.json', function (err, res) {
        if (!err) {
            global.db.strats.deleteMany({});
            global.db.strats.insertMany(JSON.parse(res));
        }
        else {
            console.error(err);
        }
    });
}

module.exports = app;
