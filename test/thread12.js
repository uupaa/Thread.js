importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        var delayTime = args[0];

        setTimeout(function() {
            proxy.post([delayTime]);
        }, delayTime);
    }, function closeRequestHandler(yes, no) {
        yes(); // [5]
    });

