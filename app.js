"use strict";

// Requires
const express      = require('express'),
      path         = require('path'),
      logger       = require('morgan'),
      cookieParser = require('cookie-parser'),
      bodyParser   = require('body-parser'),
      session      = require('express-session'),
      minify       = require('express-minify'),
      subdomain    = require('express-subdomain'),
      device       = require('express-device'),
      compress     = require('compression'),
      MongoStore   = require('connect-mongo')(session),
      fs           = require('fs'),
      app          = express();

var routes = require('./routes/siege/index-router.js');
var getPage = require('./routes/siege/get-router.js');
var controlPanel = require('./routes/siege/controlpanel-router.js');


//region Express setup
app.set('views', './views');
app.set('view engine', 'pug');                                                  // Set up jade view engine

app.use(compress({level: 4}));                                                  // Enable gzip
if (app.get('env') === 'production') {
    app.use(minify());                                                          // Enable minifying
}
else {
    app.use(logger('dev'));                                                     // Bad logger TODO: Add better logging (Winston)
}
app.use(express.static('./public'));                                            // Serve files
app.use(session({                                                               // Enable sessions
    secret: process.env.SECRET,
    store:  new MongoStore({db: app.get('env') === 'production' ? global.db : global.db['siege']}), // Powered by our MongoDB database
    cookie: {
        secure:  false,
        expires: 3600000 * 24 * 356 * 5 // 5 years
    }
}));
app.use(bodyParser.json());                                                     // Enable parser
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());                                                        // Enable cookies
app.use(device.capture());
device.enableDeviceHelpers(app);
//endregion

//region View counting
app.use('/', function (req, res, next) {
    if (req.originalUrl.indexOf('/get/') < 0) {
        var session = req.session;

        incViewCount('total');

        if (!session.views) {
            session.views = 1;
            incViewCount('unique');
        }
        else {
            session.views++;
        }
    }

    next();
});

app.use("/get*", function (req, res, next) {
    var session = req.session;

    if (!session.stratsGotten) {
        session.stratsGotten = 1;
        incViewCount('strats');
    }
    else {
        session.stratsGotten++;
        incViewCount('strats');
    }

    next();
});
//endregion

// Routes

app.use(subdomain('beta', require('./routes/siege/beta-router.js')));

app.use('/', routes);
app.use('/get', getPage);
app.use('/controlpanel', controlPanel);


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
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error:   {}
    });
});
//endregion

var incViewCount = function (type) {
    var updateQ = JSON.parse('{"$inc": {"' + type + '": 1}}');

    global.db.stats.findOneAndUpdate({total: {$exists: true}}, updateQ, function (err, docs) {
        if (err) {
            console.error(err);
        }
    });
};

module.exports = app;

// TODO: fix keys gotten in get
// Help I've completely lost what I wanted from myself with that to-do