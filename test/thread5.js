importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

throw new Error("lol"); // [1]

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        event.postback([ args[1] + " WORLD" ]);
    }, function(yes, no) {
    });

