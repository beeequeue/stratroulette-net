//Created by bq on 2016-04-08.

"use strict";
var canGetStrat = true;
var currentStrat = {};
var gamemodesToSearch = [];

$(document).ready(function () {
    autosize($('.d-textarea'));

    var cookieGM = tryJSONParse(Cookies.get("gamemodes"));
    if (cookieGM !== undefined) {
        for (var i = 0; i < cookieGM.length; i++) {
            gamemodesToSearch.push(cookieGM[i]);
            $('#gm-checkbox-' + cookieGM[i]).prop('checked', true);
        }
    }

    // Hover-over descriptions
    $('.strat-button').mouseenter(function () {
        $('.button-describer.' + $(this).attr('class').split(' ')[1])
            .stop().fadeIn(50).css("display", "inline-block");
    }).mouseleave(function () {
        $('.button-describer.' + $(this).attr('class').split(' ')[1])
            .stop().fadeOut(100);
    });

    $('.team-button').click(function () {
        if (canGetStrat && gamemodesToSearch.length > 0) {
            canGetStrat = false;
            resetPage(700);

            getStrat($(this).html(), function (err, strat) {
                if (!err) {
                    setTimeout(function () {
                        newStrat(strat);
                    }, 700);
                }
                else {
                    var errorStrat = {
                        desc:   "Error Code: " + err.status + "<br>" + err.statusText,
                        author: "",
                        votes:  0,
                        name:   "Error"
                    };

                    setTimeout(function () {
                        newStrat(errorStrat);
                    }, 700);
                }
            });
        }
    });

    $('.like').click(function () {
        if (currentStrat.uid) {
            giveOpinion(currentStrat.uid, !currentStrat.liked, function (err, res) {
                if (!err) {
                    currentStrat.liked = !currentStrat.liked;
                    currentStrat.liked ? currentStrat.voteCount++ : currentStrat.voteCount--;
                    setLikeCounter(currentStrat.voteCount, 150);
                    setLikedStatus(currentStrat.liked);
                }
                else {
                    console.error(err);
                }
            });
        }
    });

    $('.submit').click(function () {
        openDialogue('#submission-window');
    });

    $('#submission-submit').click(function () {
        var data = {
            author:    $('#submission-author').val(),
            name:      $('#submission-name').val(),
            desc:      $('#submission-msg').val(),
            team:      $('#submission-team').val(),
            gamemodes: []
        };


        // Alphanumerical, '-', and '_'
        var regexp = /^[a-zA-Z0-9_ \/\-]+$/;

        for (var i = 0; i < 2; i++) {
            var value = data[Object.keys(data)[i]];

            if (!regexp.test(value) || value.length < 3 || value.length > 16) {
                giveErrorMessage('submission', 'Invalid ' + Object.keys(data)[i] + '!');
                return;
            }
        }


        var gm = ['bombs', 'hostage', 'capturesite'];

        gm.forEach(function (mode) {
            if ($('#submission-checkbox-' + mode).prop('checked'))
                data.gamemodes.push(mode);
        });

        if (data.gamemodes.length < 1) {
            giveErrorMessage('submission', 'Please select at least one gamemode');
            return;
        }


        submitStrat(data, function (err) {
            if (!err) {
                giveSuccess('submission');
            }
            else {
                giveErrorMessage('submission', err.responseJSON.message);
            }
        });

    });

    $('.report').click(function () {
        if (!$(this).hasClass("disabled")) {
            openDialogue('#report-window');
        }
    });

    $('#report-submit').click(function () {
        var selec = '#report-window';

        if ($('#report-msg').val().length > 5) {
            reportStrat(currentStrat.uid, $('#report-msg').val(), function (err, res) {
                if (!err) {
                    $(selec + ' .d-success').fadeIn(250);

                    setTimeout(function () {
                        $('#fader').click();
                    }, 1000);

                    setTimeout(function () {
                        $('#report-msg').val('');
                        $(selec + ' .d-success').fadeOut(250);
                    }, 1125);
                }
                else {
                    giveErrorMessage('report', err.responseJSON.message);
                }
            });
        }
        else {
            giveErrorMessage('report', "Please enter a message longer than 5 characters!");
        }
    });

    $('#fader').click(function () {
        var elementsToFade = ['#fader', '#report-window', '#submission-window'];

        elementsToFade.forEach(function (elem) {
            $(elem).stop().fadeOut(150);
        });
    });

    $('.gm-checkbox').click(function () {
        var gm = $(this).attr('id').replace("gm-checkbox-", "");
        var index = gamemodesToSearch.indexOf(gm);

        if (index < 0) {
            gamemodesToSearch.push(gm);
        }
        else {
            gamemodesToSearch.splice(index, 1);
        }

        Cookies.set("gamemodes", gamemodesToSearch, {expires: 365});
    });

    $('.gamemode-container').click(function () {
        $(this).find("input").click();
    });

    $('.checkbox label').click(function (e) {
        e.stopPropagation();
    });
});

var giveErrorMessage = function (window, msg) {
    var errorElem = $('#' + window + '-window .d-error');

    // Show error message
    errorElem.html(msg).stop().fadeIn(250);

    // Wait before hiding it again
    setTimeout(function () {
        errorElem.stop().fadeOut(2500, function () {
            $(this).html('Error message');
        });
    }, 2500);
};

var giveSuccess = function (window) {
    var succElem = $('#' + window + '-window .d-success');
    succElem.fadeIn(250); // Fade in success image

    // Then wait before fading window out
    setTimeout(function () {
        $('#fader').click();
    }, 1250);

    // Also wait until window gone to reset window
    setTimeout(function () {
        $('#' + window + '-window .d-textinput, #' + window + '-window .d-textarea').val('');
        succElem.fadeOut(250);
    }, 1400);
};

var openDialogue = function (elem) {
    $('#fader').fadeIn(150);
    $(elem).fadeIn(150);
};

var resetPage = function (speed) {
    $('#desc')
        .stop()
        .animate({
            height: 0
        }, speed, function () {
            $(this).html("");
        });

    $('#names')
        .stop()
        .animate({
            scrollTop: 70
        }, speed);

    removeOneLetterAtATime('#author', 20);

    setLikedStatus(false);

    setLikeCounter(0, speed);
};

var getStrat = function (type, next) {
    if (isNaN(type)) {
        switch (type.toLowerCase()) {
            case 'def':
            case 'atk':
                $.post({
                    url:         '/get/' + type.toLowerCase(),
                    data:        JSON.stringify({
                        not:       [currentStrat.uid],
                        gamemodes: gamemodesToSearch
                    }),
                    dataType:    'json',
                    contentType: 'application/json',
                    success:     function (data) {
                        currentStrat = data;
                        next(null, data);
                    },
                    error:       function (err) {
                        next(err);
                    }
                });
                break;

            default:
                next(new Error('Invalid team'));
        }
    }
    else {
        $.post({
            url:         '/get/' + type,
            data:        JSON.stringify({
                not: [currentStrat.uid]
            }),
            dataType:    'json',
            contentType: 'application/json',
            success:     function (data) {
                currentStrat = data;
                console.dir(data);
                next(null, data);
            },
            error:       function (err) {
                next(err);
            }
        });
    }
};

var newStrat = function (strat) {
    $('.name:not(div)').html(strat.name);

    $('#names')
        .stop()
        .animate({
            scrollTop: 140
        }, function () {
            var tempName = $('.name.' + 1).html();

            $('#names').scrollTop(0);
        });


    oneLetterAtATime('#author', strat.author, 25);

    setLikeCounter(strat.voteCount, 750, 'easeInOutQuad');

    setLikedStatus(strat.liked);

    $('#desc')
        .html(strat.desc.replace('\\n', '<br>'))
        .stop()
        .animate({
            height: $("#desc").get(0).scrollHeight
        }, 700, function () {
            canGetStrat = true;
        });
    
    $('.strat-button').removeClass("disabled");
};

var oneLetterAtATime = function (target, text, interval, index) {
    if (index == null)
        index = 0;

    if (index < text.length) {
        $(target).html($(target).html() + text[index++]);
        setTimeout(function () {
            oneLetterAtATime(target, text, interval, index);
        }, interval);
    }
};

var removeOneLetterAtATime = function (target, interval, index) {
    target = $(target);
    var content = target.html();

    if (index == null)
        index = content.length;

    if (index > 0) {
        target.html(content.substr(0, index - 1));
        index--;

        setTimeout(function () {
            removeOneLetterAtATime(target, interval, index);
        }, interval);
    }
};

var setLikeCounter = function (val, speed, easing) {
    var $likeCounter = $('#like-counter');
    $likeCounter.stop().animate({Counter: val}, {
        duration: speed, easing: easing || 'swing', step: function () {
            // Bug: Becomes NaN on first ticks
            $likeCounter.html("+" + Math.round(this.Counter)).toString();
        }
    });
};

var setLikedStatus = function (val) {
    var $elem = $('.strat-button.like');

    $({deg: getRotationDegrees($elem)}).stop().animate({deg: 10 * val}, {
        duration: 250,
        step:     function (now) {
            $elem.css({
                transform: 'rotate(' + now + 'deg)'
            });
        }
    });

    function getRotationDegrees(obj) {
        var matrix = obj.css("-webkit-transform") ||
            obj.css("-moz-transform") ||
            obj.css("-ms-transform") ||
            obj.css("-o-transform") ||
            obj.css("transform");
        if (matrix !== 'none') {
            var values = matrix.split('(')[1].split(')')[0].split(',');
            var a = values[0];
            var b = values[1];
            var angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
        }
        else {
            var angle = 0;
        }
        return (angle < 0) ? angle + 360 : angle;
    }
};

var giveOpinion = function (uid, toLike, next) {
    var url  = toLike ? 'like' : 'unlike',
        data = {uid: uid};

    $.post({
        url:         '/' + url,
        data:        JSON.stringify(data),
        contentType: "application/json",
        success:     function (data) {
            next(null, data);
        }, error:    function (err) {
            next(err);
        }
    });
};

// TODO: Change to "give feedback"
var reportStrat = function (uid, message, next) {
    var data = {
        uid:     uid,
        message: message
    };

    $.post({
        url:         '/report',
        data:        JSON.stringify(data),
        contentType: 'application/json',
        success:     function (data) {
            next(null, data);
        }, error:    function (err) {
            next(err);
        }
    });
};

var submitStrat = function (data, next) {
    $.post({
        url:         '/submit',
        data:        JSON.stringify(data),
        contentType: "application/json",
        success:     function (data) {
            next(null, data);
        }, error:    function (err) {
            next(err);
        }
    });
};

var tryJSONParse = function (string) {
    try {
        return JSON.parse(string);
    } catch (e) {
        return undefined;
    }
};