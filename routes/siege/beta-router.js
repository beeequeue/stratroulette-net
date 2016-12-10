const holidayChecker = require("../../extras/holiday-checker.js");
const express = require('express');
const stratDB = global.db['siege'].strats;

var router = express.Router();


/* GET home page. */
router.get('/', function (req, res) {    
    var reply =
            "<style>p{max-width:500px}</style>" +
            "'<h1>Hello!</h1>" +
            "<p>I am currently not testing anything here!</p>" +
            "<p>Feel free to come back later!</p>";

    res.send(reply);
});

module.exports = router;