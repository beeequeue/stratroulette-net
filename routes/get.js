var express = require('express');
var router = express.Router();
var fieldFilter = {
    _id:     false,
    reports: false
};


router.post('/:type', function (req, res) {
    handleRequest(req, res);
});

router.get('/:type', function (req, res) {
    handleRequest(req, res);
});

var handleRequest = function (req, res) {
    var team      = req.params.type,
        gamemodes = req.body.gamemodes,
        notWanted = req.body.not,
        query     = {},
        strat     = {};

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
                .toArray(function (err, docs) {
                    if (!err) {
                        // If the array of not wanted strats is there
                        if (notWanted == null && notWanted.length < 1) {
                            // Set unwanted strat uid to a non-existent uid
                            notWanted = [-1];
                        }
                        
                        do {
                            // Generate a random uid until we get one not in the array
                            strat = docs[randomNum(0, docs.length)];
                        } while (notWanted.indexOf(strat.uid) > -1);

                        strat.liked = strat.votes.indexOf(req.session.id) > -1;
                        delete strat.votes;

                        res.json(strat);
                    }
                    else {
                        res.status(500).json({message: "Couldn't get strat"});
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
                        res.status(500).json({message: "Couldn't get strat"});
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
                                res.json({});
                            }
                        }
                        else {
                            res.status(500).json({message: "Couldn't get strat"});
                        }
                    });
            }
            else {
                next(); // 404
            }
    }
};

function randomNum(min, max) {
    return Math.floor((Math.random() * max) + min);
}

module.exports = router;