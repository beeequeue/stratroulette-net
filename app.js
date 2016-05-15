"use strict";

// Requires
const express      = require('express'),
      path         = require('path'),
      favicon      = require('serve-favicon'),
      logger       = require('morgan'),
      cookieParser = require('cookie-parser'),
      bodyParser   = require('body-parser'),
      session      = require('express-session'),
      minify       = require('express-minify'),
      compress     = require('compression'),
      MongoStore   = require('connect-mongo')(session),
      fs           = require('fs');


var routes  = require('./routes/index'),
    getPage = require('./routes/get');

var app = express();


//region Express setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');                                     // Set up jade view engine

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));    // Website icon
app.use(logger('dev'));                                             // Bad logger TODO: Add better logging (Winston)
app.use(compress({level: 4}));                                      // Enable gzip
app.use(minify());                                                  // Enable minifying
app.use(express.static(path.join(__dirname, 'public')));            // Serve files
app.use(session({                                                   // Enable sessions
    secret: process.env.SECRET,
    store:  new MongoStore({db: global.db}),                        // Powered by our MongoDB database
    cookie: {
        secure:  false,
        expires: 3600000 * 24 * 356 * 5 // 5 years
    }
}));
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

module.exports = app;
