"use strict";

const holidayChecker = require("../../extras/holiday-checker.js");
const express = require('express');
const stratDB = global.db['siege'].strats;
const submDB = global.db['siege'].submissions;

const settingsMeta = [{
    id: 'disableHoliday',
    desc: 'Disable holiday themes'
}, {
    id: 'preferDesktop',
    desc: 'Prefer desktop website'
// }, {
//     id: "disableAds",
//     desc: "Disable ads :("
}];

var router = express.Router(),
    holiday = "normal";

/* GET home page. */
router.get('/', function (req, res) {
    var locals = {
        holiday: "normal",
        settings: {},
        settingsMeta: settingsMeta,
        sessionID: req.cookies['connect.sid']
    };

    var reqSettings = {
        disableHoliday: 0,
        preferDesktop: 0,
        disableAds: 0
    };

    for (let setting of settingsMeta) {
        let key = setting.id;
        reqSettings[key] = req.cookies[key] || 0;

        res.cookie(key, reqSettings[key] || 0, {
            domain: process.env.DOMAIN || '.stratroulette.net',
            expires: new Date(Date.now() + 1209600000)
        });
    }

    locals.holiday =
        reqSettings.disableHoliday == 1 ? "normal" : holiday;

    locals.settings = reqSettings;

    if (req.device.type === "desktop" || reqSettings.preferDesktop == 1)
        res.render('siege/index', locals);
    else
        res.render('siege/mobile', locals);
});

router.post('/like', function (req, res) {
    if (req.body.uid) {
        var findQ = {
            uid: req.body.uid,
            votes: {
                $nin: [req.session.id]
            }
        };
        var updateQ = {
            $push: {
                votes: req.session.id
            },
            $inc: {
                voteCount: 1
            }
        };

        stratDB.findOneAndUpdate(findQ, updateQ, function (err) {
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
            uid: req.body.uid,
            votes: {
                $in: [req.session.id]
            }
        };
        var updateQ = {
            $pull: {
                votes: req.session.id
            },
            $inc: {
                voteCount: -1
            }
        };

        stratDB.findOneAndUpdate(findQ, updateQ, function (err) {
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
            var findQ = {
                uid: req.body.uid
            };
            var updateQ = {
                $push: {
                    reports: {
                        sessionID: req.session.id,
                        message: req.body.message
                    }
                }
            };

            stratDB.findOneAndUpdate(findQ, updateQ, function (err) {
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
    var data = req.body,
        regexp = /^[a-zA-Z0-9_ \/\-]+$/, // Alphanumerical, '-', and '_'
        valuesToCheck = ['author', 'name'],
        validGamemodes = ['bombs', 'hostage', 'capturesite'],
        validTeams = ['atk', 'def', 'both'];

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


    submDB.insertMany([data], function (err) {
        if (!err) {
            res.end();
        }
        else {
            console.error(err);
            res.status(504).json({message: 'Server error. Try again later'});
        }
    });
});


holiday = holidayChecker.season();

setInterval(function () {
    holiday = holidayChecker.season();
}, 1000 * 60 * 60 * 2);

module.exports = router;
