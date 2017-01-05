const fs = require("fs");
require("datejs");

var holidaySeason = "normal";

var holidays = {
    christmas: {
        start: "Dec 1",
        end:   "Jan 10 23:59"
    }
};

function getSeason() {
    var now = Date.parse("now");

    for (var h in holidays) {
        var holiday = holidays[h];

        if (now.between(Date.parse(holiday.start), Date.parse(holiday.end))) {
            holidaySeason = h;
            return;
        }
    }

    holidaySeason = "normal";
}


getSeason();

setInterval(function () {
    getSeason();
}, 1000 * 60 * 60 * 12);

module.exports.season = () => holidaySeason;