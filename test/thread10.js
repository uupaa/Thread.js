importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var memory = "";

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        memory += args[1];

        event.postback([args[0], memory]);

    }, function(yes, no) {
        yes();
    });

