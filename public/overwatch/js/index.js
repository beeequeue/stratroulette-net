/**
 * Created by adam.haglund on 2016-10-14.
 */

var bgs = ['hanamura', 'dorado', 'hollywood', 'anubis',  'kingsrow',  'eichenwalde',  'gibraltar',  'numbani',  'volskaya'];
var i = 0;

$(document).ready(function () {
    setInterval(function () {
        i++;
        if(i >= bgs.length) i = 0;
        $('body').css('background', 'url(overwatch/img/bg/'+ bgs[i] +'.jpg) no-repeat fixed bottom');
    }, 10000);
});