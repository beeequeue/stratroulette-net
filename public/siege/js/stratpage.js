//Created by bq on 2016-04-08.
"use strict";

var canGetStrat       = true,
    currentStrat      = {},
    lastStrats        = [],
    lastStratsAmount  = 6,
    gamemodesToSearch = [];

var config = {
    deskPref: false
};

$(document).ready(function () {
    autosize($('.d-textarea'));
    new Clipboard('.share');
    $('.bigText').bigText({horizontalAlign: "center", maximumFontSize: 65});

    // Tooltipster setup
    $.fn.tooltipster('setDefaults', {
        delay: 0,
        speed: 175
    });

    $('.tooltip').tooltipster();
    $('.d-textinput, .d-textarea')
        .tooltipster({
            delay:         0,
            speed:         175,
            trigger:       'none',
            position:      'right',
            contentAsHTML: true
        })
        .on('focus click', function () {
            $(this).tooltipster('show');
        })
        .on('focusout', function () {
            $(this).tooltipster('hide');
        });

    var cookieGM = tryJSONParse(Cookies.get('gamemodes'));
    if (cookieGM !== undefined) {
        for (var i = 0; i < cookieGM.length; i++) {
            gamemodesToSearch.push(cookieGM[i]);
            $('#gm-checkbox-' + cookieGM[i]).prop('checked', true);
        }
    }

    $('.team-button').click(function () {
        setStrat($(this).html());
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
            name:      $('#submission-stratname').val(),
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
        
        data.ip = clientIP;


        submitStrat(data, function (err) {
            if (!err) {
                giveSuccess('submission');
            }
            else {
                giveErrorMessage('submission', err.responseJSON.message);
            }
        });

    });

    $('.feedback').click(function () {
        if (!$(this).hasClass("disabled")) {
            openDialogue('#feedback-window');
        }
    });

    $('#feedback-submit').click(function () {
        var selec = '#feedback-window';

        if ($('#feedback-msg').val().length > 5) {
            feedbackStrat(currentStrat.uid, $('#feedback-msg').val(), function (err, res) {
                if (!err) {
                    $(selec + ' .d-success').fadeIn(250);

                    setTimeout(function () {
                        $('#fader').click();
                    }, 1000);

                    setTimeout(function () {
                        $('#feedback-msg').val('');
                        $(selec + ' .d-success').fadeOut(250);
                    }, 1125);
                }
                else {
                    giveErrorMessage('feedback', err.responseJSON.message);
                }
            });
        }
        else {
            giveErrorMessage('feedback', "Please enter a message longer than 5 characters!");
        }
    });

    $('.gm-checkbox').on('change', function () {
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

    $('.setting-checkbox input').on('change', function () {
        var changed = $(this).attr("id").replace("setting-", "");
        config[changed] = $(this).is(":checked");
        saveConfig();
    });

    $('.checkbox label').click(function (e) {
        e.stopPropagation();
    });

    // remove false after testing
    if (mobile === false && deviceIsMobile && !Cookies.get("seenBetaNotice") && false) {
        openDialogue('#beta-dialogue');
        $('body').bind('touchmove', function (e) {
            e.preventDefault()
        });
    }

    //region Specific strat getting

    $(window).bind('hashchange', function () {
        setStrat(window.location.hash.substr(1));
    });

    var idAskedFor = window.location.hash.substr(1);

    if (idAskedFor && !isNaN(idAskedFor)) {
        setStrat(idAskedFor);
    }
    
    //endregion
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

var closeAllDialogues = function () {
    var elementsToFade = ['#fader', '.dialogue'];

    elementsToFade.forEach(function (elem) {
        $(elem).stop().fadeOut(150);
    });
};

var openSettings = function () {
    openDialogue($('#settings'));
};

var loadConfig = function () {
    var newConfig = tryJSONParse(Cookies.get("config"));

    if (newConfig != undefined) {
        config = newConfig;
    }
    else {
        saveConfig();
    }
};

var saveConfig = function () {
    Cookies.set("config", config, {expires: 180});
};

var resetPage = function (speed) {
    let animation = mobile ? {opacity: 0} : {height: 0};

    $('#center').addClass('started');

    $('#desc')
        .stop()
        .animate(animation, speed, function () {
            $(this).html("");
        });

    $('#names')
        .stop()
        .animate({
            scrollTop: 70
        }, speed);

    $('#author').find('img:not(".hidden")').addClass("hidden").parents("a").attr("href", "javascript:");

    removeOneLetterAtATime('#author p', 20);

    setLikedStatus(false);

    setLikeCounter(0, speed);
};

var getStratData = function (type, next) {
    var data;

    if (isNaN(type)) {
        switch (type.toLowerCase()) {
            case 'def':
            case 'atk':
                data = {
                    not:       lastStrats,
                    gamemodes: gamemodesToSearch
                };
                break;

            default:
                next(new Error('Invalid type'));
        }
    }
    else {
        data = {not: [currentStrat.uid]};
    }

    $.post({
        url:         '/get/' + type.toLowerCase(),
        data:        JSON.stringify(data),
        dataType:    'json',
        contentType: 'application/json',
        success:     function (data) {
            currentStrat = data;
            updateLatestStrats(data.uid);
            ga('send', {
                hitType:       'event',
                eventCategory: 'StratGet',
                eventAction:   'success'
            });

            next(null, data);
        },
        error:       function (err) {
            ga('send', {
                hitType:       'event',
                eventCategory: 'StratGet',
                eventAction:   'fail'
            });

            next(err);
        }
    });
};

var fillPage = function (strat) {
    $('.name:not(div)').html(strat.name).bigText({
        horizontalAlign: "center",
        maximumFontSize: 50
    });

    $('#names')
        .stop()
        .animate({
            scrollTop: 146
        }, function () {
            $('#names').scrollTop(0);
        });

    $('.' + strat.author.type).removeClass("hidden").parents("a").attr("href", strat.author.link);

    // If Reddit author prefix is missing then add /u/
    if (strat.author.type === "reddit" && strat.author.name.indexOf('/u/') < 0) {
        strat.author.name = "/u/" + strat.author.name;
    }

    oneLetterAtATime('#author p', strat.author.name || strat.author, 25);

    setLikeCounter(strat.voteCount, 750, 'easeInOutQuad');

    setLikedStatus(strat.liked);

    let desc = $('#desc');
    desc.html(strat.desc.replace('\\n', '<br>').replace('\n', '<br>'));
    let animation = mobile ? {opacity: 1} : {height: desc.get(0).scrollHeight};

    desc.stop()
        .animate(animation, 700, function () {
            canGetStrat = true;
        });

    $('.share').attr('data-clipboard-text', 'http://stratroulette.net#' + strat.uid);

    // Enable buttons and add tooltips
    if ($('.like').hasClass("disabled")) {
        $('.strat-button').removeClass("disabled").tooltipster();
    }
};

var setStrat = function (type) {
    if (canGetStrat && gamemodesToSearch.length > 0) {
        canGetStrat = false;
        resetPage(700);

        getStratData(type, function (err, strat) {
            if (!err) {
                setTimeout(function () {
                    fillPage(strat);
                }, 700);
            }
            else {
                var errorStrat = {
                    desc:   err.statusText + "<br>" + err.responseJSON.message,
                    author: "Error",
                    votes:  0,
                    name:   err.status.toString()
                };

                setTimeout(function () {
                    fillPage(errorStrat);
                }, 700);
            }
        });
    }
};

var updateLatestStrats = function (newID) {
    var tempLastStrats = [newID];
    for (var i = 0; i < lastStrats.length; i++) {
        if (i < lastStratsAmount - 1) {
            tempLastStrats[i + 1] = lastStrats[i];
        }
    }
    lastStrats = tempLastStrats;
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
        var angle = 0;
        var matrix = obj.css("-webkit-transform") ||
            obj.css("-moz-transform") ||
            obj.css("-ms-transform") ||
            obj.css("-o-transform") ||
            obj.css("transform");
        if (matrix !== 'none') {
            var values = matrix.split('(')[1].split(')')[0].split(',');
            var a = values[0];
            var b = values[1];
            angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
        }
        else {
            angle = 0;
        }
        return (angle < 0) ? angle + 360 : angle;
    }
};

var giveOpinion = function (uid, toLike, next) {
    var url  = toLike ? 'like' : 'unlike', // To like or not to like, that is the question.
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

var feedbackStrat = function (uid, message, next) {
    var data = {
        uid:     uid,
        message: message,
        ip:      clientIP
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

var seenNotice = function () {
    Cookies.set("seenBetaNotice", true, {expires: 90});
    $('body').unbind('touchmove');
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
