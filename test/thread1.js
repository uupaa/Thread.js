importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        event.postback([ args[1] + " WORLD" ]); // [2]
    }, function closeRequestHandler(yes, no) {
        yes(); // [5]
    });

