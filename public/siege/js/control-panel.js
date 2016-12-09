// Created by adam.haglund on 2016-05-20.
// May god have mercy on those who enter this script
"use strict";

var template = {},
    selected = '';

$(document).ready(function () {
    $.fn.tooltipster('setDefaults', {
        delay:         0,
        speed:         175,
        trigger:       'none',
        position:      'right',
        contentAsHTML: true
    });

    $('.button').button();

    template = $('.strat-container').clone();

    fillList();

    $('.accept').click(function () {
        acceptSubmission();
    }).tooltipster();

    $('.reject').click(function () {
        rejectSubmission($('.reject-message').val());
    }).tooltipster();
});

// Fills out an accordion with gotten submissions
var fillList = function () {
    for (var i = 0; i < submissions.length; i++) {
        var sub       = submissions[i],
            $newStrat = template.clone();

        sub.author = validateAuthor(sub.author);

        $newStrat.find('.strat-name').attr('value', sub.name);
        $newStrat.find('.strat-desc').text(sub.desc);
        $newStrat.find('.author-name').data('type', sub.author.type).attr('value', sub.author.name);
        $newStrat.find('.' + sub.author.type).removeClass('hidden');
        $newStrat.find('a').attr('href', sub.author.link);
        if (sub.team === 'both') {
            $newStrat.find('.team-button').removeClass('disabled');
        }
        else {
            $newStrat.find('.' + sub.team).removeClass('disabled');
        }

        for (var j = 0; j < sub.gamemodes.length; j++) {
            var gm = sub.gamemodes[j];
            $newStrat.find('.gm-checkbox-' + gm).attr("checked", true);
        }


        $newStrat = $('#accordion')
            .append('<p class="strat-header ' + sub._id + '" data-_id="' + sub._id + '">' + sub.author.name + ' - ' + sub.name + '</p>')
            .append('<div class="strat-container ' + sub._id + '" data-_id="' + sub._id + '">' + $newStrat.html() + '</div>');

        $newStrat.find('.team-button').off().on('click', function () {
            $(this).toggleClass('disabled');
        });
    }
    
    
    //-- Add functionality
    $('#accordion').accordion({
        heightStyle: 'content'
    });
    $('.tooltip')
        .tooltipster({
            delay:         0,
            speed:         175,
            trigger:       'none',
            position:      'top',
            contentAsHTML: true
        })
        .on('focus click', function () {
            $(this).tooltipster('show');
        })
        .on('focusout', function () {
            $(this).tooltipster('hide');
        });
    
    autosize($('textarea'));
    
    updateSelecting();
    
    $('.gamemode-container').click(function () {
        $(this).find("input").click();
    });
    
    $('.gamemode-button label').click(function (e) {
        e.stopPropagation();
    });

    //-- Remove template
    $('.strat-header:first-child').remove();
    $('.strat-container:first-child').remove();
};

// Gets all the info from the selected submission and sends it to be accepted
var acceptSubmission = function () {
    var subID      = selected,
        submission = $('.strat-container.' + subID).clone(),
        data       = {};
    
    if (selected == undefined || selected == "" || submission == undefined) {
        feedbackTooltip('.accept', 'Please re-select the submission!');
        return;
    }

    //-- Strat Name
    data.name = submission.find('.strat-name').val();


    //-- Author
    data.author = {
        name: submission.find('.author-name').val()
    };

    data.author = validateAuthor(data.author);


    //-- Gamemodes
    var gms     = ['bombs', 'hostage', 'capturesite'],
        checked = [];

    for (var i = 0; i < gms.length; i++) {
        if (submission.find('.gm-checkbox-' + gms[i] + ':checked').val() === 'on') {
            checked.push(gms[i]);
        }
    }

    if (checked.length === 0) {
        feedbackTooltip('.accept', 'At least one gamemode has to be checked');
        return;
    }

    data.gamemodes = checked;


    //-- Strat Team
    if (submission.find('.team-button:not(.disabled)').length === 0) {
        feedbackTooltip('.accept', 'At least one team has to be enabled');
        return;
    }

    data.team = submission.find('.team-button:not(.disabled)').length == 1 ?
        submission.find('.team-button:not(.disabled)').html().toLowerCase() : 'both';


    //-- Strat Description
    data.desc = submission.find('.strat-desc').val();


    //-- Strat _id
    data._id = subID;


    $.post({
        url:         '/controlpanel/accept',
        data:        JSON.stringify(data),
        contentType: "application/json",
        success:     function (data) {
            feedbackTooltip('.accept', data.message);
            $('.reject-message').val('');

            $('.' + subID).remove();
            selected = null;
        }, error:    function (err) {
            feedbackTooltip('.accept', "Error:<br>" + err.responseJSON.message || err.message || "An error occurred");
            $('.reject-message').val('');

            if (err.responseJSON.action == 'remove') {
                $('.' + subID).remove();
                selected = null;
            }
        }
    });
};

// Reject submission
var rejectSubmission = function (message) {
    if (selected === undefined || selected === "") {
        feedbackTooltip('.reject', 'Please re-select the submission!');
        return;
    }

    var subID = selected;

    var data = {
        subID:   subID,
        message: message
    };

    $.post({
        url:         '/controlpanel/reject',
        data:        JSON.stringify(data),
        contentType: "application/json",
        success:     function (data) {
            feedbackTooltip('.reject', data.message);
            $('.reject-message').val('');

            $('.' + subID).remove();
            selected = null;
        }, error:    function (err) {
            feedbackTooltip('.reject', "Error:<br>" + err.responseJSON.message || err.message || "An error occurred");
            $('.reject-message').val('');

            if (err.responseJSON.action == 'remove') {
                $('.' + subID).remove();
                selected = null;
            }
        }
    });
};

var feedbackTooltip = function (elem, message) {
    $(elem).tooltipster('content', message).tooltipster('show');

    setTimeout(function () {
        $(elem).tooltipster('hide');
    }, 2750);
};

var updateSelecting = function () {
    $('.strat-header').click(function () {
        selected = $(this).data('_id');
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