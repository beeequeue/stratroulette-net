var express = require('express');
var router = express.Router();
var fieldFilter = {
    _id:       false,
    reports:   false,
    original:  false,
    moderator: false
};


router.post('/:type', function (req, res) {
    handleRequest(req, res);
});

router.get('/:type', function (req, res) {
    handleRequest(req, res);
});

var handleRequest = function (req, res) {
    var team          = req.params.type,
        gamemodes     = req.body.gamemodes,
        notWanted     = req.body.not,
        query         = {},
        strat         = {},
        removedStrats = [];

    switch (team) {
        /* 
         * If request is for a team return a random one
         * If it is a post request it can also include an array 
         * with strats it does not want, as well as the gamemodes it wants
         */
        case 'def':
        case 'atk':
            if (!gamemodes || gamemodes.length < 1) {
                gamemodes = ['bombs', 'capturesite', 'hostage'];
            }

            query = {
                team:      team,
                gamemodes: {
                    $in: gamemodes
                }
            };

            global.db.strats.find(query, fieldFilter)
                .toArray(function (err, strats) {
                    if (!err && strats.length > 0) {
                        // If the array of not wanted strats isn't there
                        if (notWanted == null || !Array.isArray(notWanted) || notWanted.length < 1) {
                            // Set unwanted strat uid to a non-existent uid
                            notWanted = [-1];
                        }

                        // Separate not wanted strats into their own array
                        for (var i = 0; i < strats.length; i++) {
                            if (notWanted.indexOf(strats[i].uid) > -1) {
                                removedStrats.push(strats[i]);
                                strats.splice(i, 1);
                            }
                        }

                        if (strats.length > 0) {
                            strat = strats[randomNum(0, strats.length)];

                            strat.liked = strat.votes.indexOf(req.session.id) > -1;
                            delete strat.votes;

                            res.json(strat);
                        }
                        else {
                            // If the only choice is to pick one of the not wanted strats do it
                            strat = removedStrats[randomNum(0, removedStrats.length)];

                            strat.liked = strat.votes.indexOf(req.session.id) > -1;
                            delete strat.votes;

                            res.json(strat);
                        }
                    }
                    else if (!err) {
                        respondJSON("Couldn't get any strats matching your filters", 400);
                    }
                    else {
                        respondJSON("Couldn't get any strats", 500);
                    }
                });

            break;

        case 'all':
            var allStrats = [];

            global.db.strats.find({}, fieldFilter)
                .toArray(function (err, docs) {
                    if (!err) {
                        for (var i = 0; i < docs.length; i++) {
                            docs[i].liked = docs[i].votes.indexOf(req.session.id) > -1;
                            delete docs[i].votes;

                            allStrats.push(docs[i]);
                        }

                        res.json(allStrats);
                    }
                    else {
                        respondJSON("Couldn't get any strats", 500);
                    }
                });
            break;

        default:
            if (!isNaN(team)) {
                query = {
                    uid: Number(team)
                };

                global.db.strats.find(query, fieldFilter)
                    .toArray(function (err, doc) {
                        if (!err) {
                            if (doc.length > 0) {
                                doc[0].liked = doc[0].votes.indexOf(req.session.id) > -1;
                                delete doc[0].votes;

                                res.json(doc[0]);
                            }
                            else {
                                res.status(404).json({message:""});
                            }
                        }
                        else {
                            respondJSON("Couldn't get any strats", 500);
                        }
                    });
            }
            else {
                next(); // 404
            }
    }

    var respondJSON = function (message, code) {
        res.status(code || 200).json({code: code || 200, message: message});
    };
};

function randomNum(min, max) {
    return Math.floor((Math.random() * max) + min);
}

module.exports = router;