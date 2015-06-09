importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function(args, event) {
        event.postback([ args[1] + " WORLD" ]); // [2]
    }, function(yes, no) {
        yes(); // [5]
    });

