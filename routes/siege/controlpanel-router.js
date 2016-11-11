// Created by adam.haglund on 2016-05-18.
"use strict";
const stratDB = global.db['siege'].strats;
const submDB = global.db['siege'].submissions;
const modDB = global.db.moderators;

var express  = require('express'),
    ObjectID = require('mongodb').ObjectID,
    router   = express.Router();

router.get('/', function (req, res) {
    var modID = req.cookies.moderatorID;

    if (modID == null) {
        res.render('siege/login');
    }
    else {
        checkModeratorID(modID, function (isMod) {
            if (isMod) {
                submDB.find({}).toArray(function (err, docs) {
                    if (!err) {
                        res.render('siege/control-panel', {submissions: JSON.stringify(docs)});
                    }
                    else {
                        console.error(err);
                    }
                });
            }
            else {
                res.render('login');
            }
        });
    }
});

router.post('/accept', function (req, res) {
    checkModeratorID(req.cookies.moderatorID, function (isMod) {
        if (isMod) {
            acceptSubmission(req.body, req.cookies.moderatorID, res);
        }
        else {
            // Wrong modID
            res.status(400).json({message: 'Invalid ModID'});
        }
    });
});

router.post('/reject', function (req, res) {
    checkModeratorID(req.cookies.moderatorID, function (isMod) {
        if (isMod) {
            rejectSubmission(req.body.subID, req.cookies.moderatorID, req.body.message, res);
        }
        else {
            // Wrong modID
            res.status(400).json({message: 'Invalid ModID'});
        }
    });
});

var acceptSubmission = function (acceptedSub, moderatorID, res) {
    var searchQ;

    if (typeof(acceptedSub._id) == 'string') {
        searchQ = {"_id": new ObjectID(acceptedSub._id)};
    }
    else {
        searchQ = {'id': acceptedSub._id}
    }

    submDB.find(searchQ, {
        ip:        false,
        sessionID: false
    }).toArray(function (err, originalSub) {
        if (!err) {
            if (!originalSub[0]) {
                res.status(400).send({message: "Submission has already been processed!"});
                return;
            }

            stratDB.count({}, function (err, count) {
                if (!err) {
                    originalSub[0].author = validateAuthor(originalSub[0].author);

                    acceptedSub.uid = count;
                    acceptedSub.voteCount = 0;
                    acceptedSub.votes = [];
                    acceptedSub.reports = [];
                    acceptedSub.original = originalSub[0];
                    acceptedSub.moderator = moderatorID;
                    acceptedSub.author = validateAuthor(acceptedSub.author);

                    if (acceptedSub.author == null || acceptedSub.original.author == null) {
                        returnServerError("Author is invalid");
                        return;
                    }

                    stratDB.insertOne(acceptedSub, function (err, docs) {
                        if (!err && docs.insertedCount > 0) {
                            addToModLog(moderatorID, docs.ops[0]._id, 'accept');
                            removeFromSubmissions(docs.ops[0]._id);

                            res.json({message: 'Success!', action: 'remove'});
                        }
                        else {
                            // Inserting submission
                            console.error(err);
                            returnServerError('An error occurred');
                        }
                    });
                }
                else {
                    // Counting strats
                    console.error(err);
                    returnServerError('An error occurred');
                }
            });
        }
        else {
            // Finding submission
            console.error(err);
            returnServerError('An error occurred');
        }
    });

    var returnServerError = function (message) {
        console.error(message);
        res.status(500).json({message: message});
    };
};

var rejectSubmission = function (submissionID, moderatorID, message, res) {
    if (!message || message === '') {
        res.status(400).json({message: 'Please enter a reason beneath'});
        return;
    }

    var submission;

    submDB.find({_id: new ObjectID(submissionID)})
        .toArray(function (err, originalSub) {
            submission = originalSub[0];

            submDB.deleteOne({_id: new ObjectID(submissionID)}, function (err, docs) {
                if (!err && docs.deletedCount > 0) {
                    addToModLog(moderatorID, submission || submissionID, 'reject', message);

                    res.json({message: 'Success!'});
                }
                else if (docs.deletedCount === 0) {
                    res.status(400).json({
                        message: 'Submission has already been processed!',
                        action:  'remove'
                    });
                }
                else {
                    console.error(err);

                    res.status(500).send({message: 'An error occurred'});
                }
            });
        });
};

var checkModeratorID = function (id, next) {
    modDB.find({moderatorID: id}).toArray(function (err, docs) {
        if (!err) {
            next(!!docs[0]);
        }
        else {
            console.error(err);
        }
    });
};

var removeFromSubmissions = function (subID) {
    submDB.deleteOne({'_id': new ObjectID(subID)}, function (err, docs) {
        if (err) {
            console.error("Couldn't remove accepted submission", err);
        }
    });
};

var addToModLog = function (modID, subID, action, data) {
    var logObj = {
        submission: typeof(subID) == 'object' ? subID : new ObjectID(subID),
        action:     action,
        datetime:   (new Date()).toString()
    };

    if (data)
        logObj.data = data;

    var findQ   = {'moderatorID': modID},
        updateQ = {
            $push: {
                'log': logObj
            }
        };

    modDB.findOneAndUpdate(findQ, updateQ, function (err, docs) {
        if (!err) {
        }
        else {
            console.error(err);
        }
    });
};

var validateAuthor = function (oldAuthor) {
    var newAuthor = {};

    if (typeof(oldAuthor) == 'string') {
        newAuthor.name = oldAuthor;

        if (oldAuthor.indexOf('/u/') > -1) {
            newAuthor.type = 'reddit';
            newAuthor.link = 'http://reddit.com' + oldAuthor;
        }
        else {
            newAuthor.type = 'submission';
            newAuthor.link = 'javascript: void(0)';
        }
    }
    else {
        if (oldAuthor.name.indexOf('/u/') > -1) {
            newAuthor = {
                name: oldAuthor.name,
                type: 'reddit',
                link: 'http://reddit.com' + oldAuthor.name
            };
        }
        else {
            newAuthor = {
                name: oldAuthor.name,
                type: 'submission',
                link: 'javascript: void(0)'
            };
        }
    }

    return newAuthor;
};

module.exports = router;
//TODO: Winston log