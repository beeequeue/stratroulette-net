var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.render('index', {ip: ip.substr(7, ip.length)});
});

router.post('/like', function (req, res) {
    if (req.body.uid) {
        var findQ = {
            uid:   req.body.uid,
            votes: {
                $nin: [req.session.id]
            }
        };
        var updateQ = {
            $push: {
                votes: req.session.id
            },
            $inc:  {
                voteCount: 1
            }
        };

        global.db.strats.findOneAndUpdate(findQ, updateQ, function (err) {
            if (!err) {
                res.end();
            }
            else {
                res.statusCode(504).json({message: "Couldn't update liked status."});
                console.error(err);
            }
        });
    }
    else {
        res.json({error: 'No uid recognized'});
    }
});

router.post('/unlike', function (req, res) {
    if (req.body.uid) {
        var findQ = {
            uid:   req.body.uid,
            votes: {
                $in: [req.session.id]
            }
        };
        var updateQ = {
            $pull: {
                votes: req.session.id
            },
            $inc:  {
                voteCount: -1
            }
        };

        global.db.strats.findOneAndUpdate(findQ, updateQ, function (err) {
            if (!err) {
                res.end();
            }
            else {
                res.statusCode(504).json({message: "Couldn't update liked status."});
                console.error(err);
            }
        });
    }
    else {
        res.statusCode(400).json({error: 'Did not recieve uid'});
    }
});

router.post('/report', function (req, res) {
    if (req.body.message != null) {
        if (req.body.message.length < 35) {
            var ip = req.ip;
            var findQ = {
                uid: req.body.uid
            };
            var updateQ = {
                $push: {
                    reports: {
                        ip:        req.body.ip,
                        sessionID: req.session.id,
                        message:   req.body.message
                    }
                }
            };

            global.db.strats.findOneAndUpdate(findQ, updateQ, function (err) {
                if (!err) {
                    res.end();
                }
                else {

                    console.error(err);
                    res.statusCode(504).json({message: "Couldn't submit report."});
                }
            });
        }
        else {
            res.status(400).json({message: "Report message too long"});
        }
    }
    else {
        res.status(400).json({message: "Report message too short"});
    }
});

router.post('/submit', function (req, res) {
    var data           = req.body,
        regexp         = /^[a-zA-Z0-9_ \/\-]+$/, // Alphanumerical, '-', and '_'
        valuesToCheck  = ['author', 'name'],
        validGamemodes = ['bombs', 'hostage', 'capturesite'],
        validTeams     = ['atk', 'def', 'both'];
    
    data.sessionID = req.session.id;


    // Author and Strat Name validation
    for (var i = 0; i < valuesToCheck.length; i++) {
        var value = data[valuesToCheck[i]];

        if (!regexp.test(value) || value.length < 3 || value.length > 20) {
            res.status(400).json({message: 'Invalid ' + valuesToCheck[i] + '!'});
            return;
        }
    }

    data.author = {
        name: data.author
    };

    // Check if author has reddit prefix
    if (data.author.name.indexOf("/u/") == 0) {
        data.author.type = "reddit";
        data.author.link = "http://reddit.com" + data.author.name;
    }
    else {
        data.author.type = "submission";
        data.author.link = "javascript: void(0)";
    }

    // Gamemode validation #1 (Amount)
    if (data.gamemodes.length < 1) {
        res.status(400).json({message: 'Please select at least one gamemode'});
        return;
    }

    // Gamemode validation #2 ()
    for (var j = 0; j < data.gamemodes.length; j++) {
        if (validGamemodes.indexOf(data.gamemodes[j]) === -1) {
            res.statusCode(400).json({message: 'Invalid gamemode "' + data.gamemodes[j] + '". Allowed gamemodes are bombs,hostage,capturesite'});
            return;
        }
    }

    // Team validation
    if (validTeams.indexOf(data.team) === -1) {
        res.status(400).json({message: 'Invalid team.'});
        return;
    }

    // Description validation
    if (data.desc.length > 450) {
        res.status(400).json({message: 'Please enter a description shorter than 450 characters.'});
        return;
    }


    global.db.submissions.insertMany([data], function (err) {
        if (!err) {
            res.end();
        }
        else {
            console.error(err);
            res.status(504).json({message: 'Server error. Try again later'});
        }
    });
});

module.exports = router;
