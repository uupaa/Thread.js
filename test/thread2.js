importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        event.postback([ args[1] + " WORLD" ]);
    }, function closeRequestHandler(yes, no) {
        no(); // [2]
    });

