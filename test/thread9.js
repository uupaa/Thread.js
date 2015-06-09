importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        var u8 = new Uint8Array(args[1]);

        u8[0] *= 2;
        u8[1] *= 2;
        u8[2] *= 2;

        event.postback([args[0], args[1]], [u8.buffer]);
    }, function(yes, no) {
        yes();
    });

