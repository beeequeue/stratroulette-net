const express = require('express');
const stratDB = global.db['siege'].strats;

var router = express.Router();


/* GET home page. */
router.get('/', function (req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (req.device.type === "desktop" || req.cookies.preferDesktop)
        res.send('<h1>Hello!</h1><p>I am currently trying out the mobile version of the website here!</p><p>Feel free to come here on your mobile!</p>');
    else
        res.render('siege/mobile', {ip: ip});
});

module.exports = router;