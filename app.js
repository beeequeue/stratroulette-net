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
      subdomain    = require('express-subdomain'),
      compress     = require('compression'),
      MongoStore   = require('connect-mongo')(session),
      fs           = require('fs');

var app = express();

var games   = [],
    routers = {};

for (let game of process.env.GAMES.split(",")) {
    var stat = fs.statSync('./routes/' + game);
    if (stat.isDirectory() === true)
        games.push(game);
}

for (let i = 0; i < games.length; i++) {
    let newRoute = express.Router();

    newRoute.use('/', require('./routes/' + games[i] + '/index-router.js'));
    newRoute.use('/get', require('./routes/' + games[i] + '/get-router.js'));
    newRoute.use('/controlpanel', require('./routes/' + games[i] + '/controlpanel-router.js'));

    routers[games[i]] = newRoute;
}

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
    store:  new MongoStore({db: global.db}),                                    // Powered by our MongoDB database
    cookie: {
        secure:  false,
        expires: 3600000 * 24 * 356 * 5 // 5 years
    }
}));
app.use(bodyParser.json());                                                     // Enable parser
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());                                                        // Enable cookies
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

for (let game of games) {
    app.use(subdomain(game, routers[game]));
}

// TODO: Fix index page
app.get('/', function (req, res) {
    var toSend = "", lines = [];

    lines.push("<h1>Testing stratroulette.net, eh?</h1>");
    lines.push("<h2>Available games:</h2>");

    for (let game of games) {
        lines.push('<a href="http://' + game + '.dev.dev:1212"><h2>' + game + '</h2></a>');
    }

    for (let line of lines) {
        toSend += line + "<br>"
    }

    res.send(toSend);
});

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