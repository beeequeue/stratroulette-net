//Created by bq on 2016-04-08.
"use strict";

var canGetStrat = true,
    currentStrat = {},
    lastStrats = [],
    lastStratsAmount = 6,
    gamemodesToSearch = [],
    domain = 'stratroulette.net';

var settingCookieConfig = {
    expires: 30,
    domain: "." + domain
};

$(document).ready(function () {
    setTimeout(function () {
        $('.bigText').bigText({horizontalAlign: "center", maximumFontSize: 65});
    }, 0);

    // Tooltipster setup
    $.fn.tooltipster('setDefaults', {
        delay: 0,
        speed: 100
    });

    $('.tooltip').tooltipster();
    $('.d-textinput, .d-textarea')
        .tooltipster({
            delay: 0,
            speed: 175,
            trigger: 'none',
            position: 'right',
            contentAsHTML: true
        })
        .on('focus click', function () {
            $(this).tooltipster('show');
        })
        .on('focusout', function () {
            $(this).tooltipster('hide');
        });

    loadCookieSettings();

    $('.team-button').click(function () {
        setStrat($(this).html());

        ga('send', 'get.strat');
    });

    $('.like').click(function () {
        if (currentStrat.uid) {
            giveOpinion(currentStrat.uid, !currentStrat.liked, function (err, res) {
                if (!err) {
                    currentStrat.liked = !currentStrat.liked;
                    currentStrat.liked ? currentStrat.voteCount++ : currentStrat.voteCount--;
                    setLikeCounter(currentStrat.voteCount, 150);
                    setLikedStatus(currentStrat.liked);

                    ga('send', currentStrat.liked ? 'like' : 'unlike');
                }
                else {
                    console.error(err);
                }
            });
        }
    });

    $('.submit').click(function () {
        openDialogue('#submission-window');

        ga('send', 'open.submission');
    });

    $('#submission-submit').click(function () {
        var data = {
            author: $('#submission-author').val(),
            name: $('#submission-stratname').val(),
            desc: $('#submission-msg').val(),
            team: $('#submission-team').val(),
            gamemodes: []
        };


        // Alphanumerical, '-', and '_'
        var regexp = /^[a-zA-Z0-9_ \/\-]+$/;

        for (var i = 0; i < 2; i++) {
            var value = data[Object.keys(data)[i]];

            if (!regexp.test(value) || value.length < 3 || value.length > 20) {
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

                ga('send', 'send.submission');
            }
            else {
                giveErrorMessage('submission', err.responseJSON.message);
            }
        });

    });

    $('.feedback').click(function () {
        if (!$(this).hasClass("disabled")) {
            openDialogue('#feedback-window');

            ga('send', 'open.feedback');
        }
    });

    $('#feedback-submit').click(function () {
        var selec = '#feedback-window';

        if ($('#feedback-msg').val().length > 5) {
            feedbackStrat(currentStrat.uid, $('#feedback-msg').val(), function (err, res) {
                if (!err) {
                    $(selec + ' .d-success').fadeIn(250);

                    setTimeout(function () {
                        $('#dialogue-container').click();
                    }, 1000);

                    setTimeout(function () {
                        $('#feedback-msg').val('');
                        $(selec + ' .d-success').fadeOut(250);
                    }, 1125);

                    ga('send', 'send.feedback');
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

        Cookies.set("gamemodes", gamemodesToSearch, {
            expires: 7,
            domain: "." + domain
        });
    });

    $('.setting-wrapper > span').click(function () {
        $(this).next().find('input').click();
    });

    $('.checkbox-wrapper label, .c-dialogue, .m-dialogue, .setting-checkbox label').click(function (e) {
        e.stopPropagation();
    });

    $('.settings-checkbox').change(function () {
        var setting = $(this).attr('id').replace('setting-', '');
        _settings[setting] = Number($(this).prop('checked'));

        Cookies.set(setting, _settings[setting], settingCookieConfig);
    });

    if (!mobile) {
        autosize($('.d-textarea'));

        if (!deviceIsMobile)
            $('#setting-preferDesktop').parent().parent().css('display', 'none');
    }
    else {
        fixContentHeight();
    }

    //region Specific strat getting

    $(window).bind('hashchange', function (e) {
        if (!isNaN(Number(window.location.hash.substr(1)))) {
            setStrat(window.location.hash.substr(1));
        }
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
        $('#dialogue-container').click();
    }, 1250);

    // Also wait until window gone to reset window
    setTimeout(function () {
        $('#' + window + '-window .d-textinput, #' + window + '-window .d-textarea').val('');
        succElem.fadeOut(250);
    }, 1400);
};

var openDialogue = function (elem) {
    $('#dialogue-container').fadeIn(150).css({display: "flex"});

    $(elem).fadeIn(150);
};

var closeAllDialogues = function () {
    var elementsToFade = ['#dialogue-container', '.c-dialogue', '.m-dialogue'];

    elementsToFade.forEach(function (elem) {
        $(elem).stop().fadeOut(150);
    });
};

var openSettings = function () {
    openDialogue($('#settings-window'));

    ga('send', 'open.settings');
};

var resetPage = function (speed) {
    var animation = mobile ? {opacity: 0} : {height: 0};

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

    if (mobile && !$('#anchor-ad').hasClass('hidden')) {
        fixContentHeight(110);
        $('#anchor-ad').addClass('hidden');
        $('#action-bar').css({bottom: parseInt($('#action-bar').css('bottom'), 10)});
    }
};

var getStratData = function (type, next) {
    var data;

    if (isNaN(type)) {
        switch (type.toLowerCase()) {
            case 'def':
            case 'atk':
                data = {
                    not: lastStrats,
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
        url: '/get/' + type.toLowerCase(),
        data: JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json',
        success: function (data) {
            currentStrat = data;
            updateLatestStrats(data.uid);

            next(null, data);
        },
        error: function (err) {
            next(err);
        }
    });
};

var fillPage = function (strat) {
    $('.name:not(div)').html(strat.name).bigText({
        horizontalAlign: "center",
        maximumFontSize: 50
    });

    $('.hidden:not(#anchor-ad, #author>img)').removeClass('hidden');

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

    var desc = $('#desc');
    desc.html(strat.desc.replace('\\n', '<br>').replace('\n', '<br>'));
    var animation = mobile ? {opacity: 1} : {height: desc.get(0).scrollHeight};

    desc.stop()
        .animate(animation, 700, function () {
            canGetStrat = true;
        });

    // Enable buttons and add tooltips
    if ($('.like').hasClass("disabled")) {
        $('.strat-button').removeClass("disabled").tooltipster();
        $('#action-bar').removeClass('hidden');
        desc.removeClass("text-center");
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
                    desc: err.statusText + "<br>" + err.responseJSON.message,
                    author: "Error",
                    votes: 0,
                    name: err.status.toString()
                };

                setTimeout(function () {
                    fillPage(errorStrat);
                }, 700);
            }
        });
    }
    else if (canGetStrat && gamemodesToSearch.length === 0) {
        canGetStrat = false;
        flashGameModeButtons();
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
            $likeCounter.html(Math.round(this.Counter)).toString();
        }
    });
};

var setLikedStatus = function (val) {
    var $elem = $('.strat-button.like');

    $({deg: getRotationDegrees($elem)}).stop().animate({deg: 10 * val}, {
        duration: 250,
        step: function (now) {
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
    var url = toLike ? 'like' : 'unlike', // To like or not to like, that is the question.
        data = {uid: uid};

    $.post({
        url: '/' + url,
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function (data) {
            next(null, data);
        }, error: function (err) {
            next(err);
        }
    });
};

var feedbackStrat = function (uid, message, next) {
    var data = {
        uid: uid,
        message: message,
    };

    $.post({
        url: '/report',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function (data) {
            next(null, data);
        }, error: function (err) {
            next(err);
        }
    });
};

var loadCookieSettings = function () {
    var gamemodeC = tryJSONParse(Cookies.get('gamemodes'));

    if (gamemodeC !== undefined) {
        for (var i = 0; i < gamemodeC.length; i++) {
            gamemodesToSearch.push(gamemodeC[i]);
            $('#gm-checkbox-' + gamemodeC[i]).prop('checked', true);
        }
    }

    // Settings
    for (var key in _settings) {
        $('#setting-' + key).prop('checked', _settings[key] == 1);
    }
};

var saveSettings = function () {
    for (var key in _settingsMeta) {
        Cookies.set(key, _settingsMeta[key], settingCookieConfig);
    }
};

var flashGameModeButtons = function () {
    $('.gm-checkbox').prop('checked', true);

    setTimeout(function () {
        $('.gm-checkbox').prop('checked', false);

        setTimeout(function () {
            canGetStrat = true;
        }, 250);
    }, 200);
};

var fixContentHeight = function (height) {
    $('#content').animate({"bottom": height || $('#bottom').height()}, 700);
};

var toggleHolidayAnimation = function () {
    var overlay = $('#holiday-overlay'),
        pauseButton = $('#pause-button');

    if (overlay.hasClass('paused')) {
        pauseButton.removeClass('paused');
        overlay.removeClass('paused');
    }
    else {
        pauseButton.addClass('paused');
        overlay.addClass('paused');
    }
};

var submitStrat = function (data, next) {
    $.post({
        url: '/submit',
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function (data) {
            next(null, data);
        }, error: function (err) {
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
