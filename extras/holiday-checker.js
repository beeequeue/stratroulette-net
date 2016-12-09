const fs = require("fs");
require("datejs");

var holidaySeason = "normal";

var holidays = {
    christmas: {
        start: "Dec 1",
        end:   "Dec 31 23:59"
    }
};

function getSeason() {
    var now = Date.parse("now");

    for (var h in holidays) {
        var holiday = holidays[h];

        if (true || now.between(Date.parse(holiday.start), Date.parse(holiday.end))) {
            holidaySeason = h;
            return;
        }
    }

    holidaySeason = "normal";
}


getSeason();

setInterval(function () {
    getSeason();
}, 1000 * 60 * 60 * 4);

module.exports.season = () => holidaySeason;