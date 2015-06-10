importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function(args, event) {
        if (args === undefined ||
            args === 0 ||
            args === "" ||
            (Array.isArray(args) && args.length === 0)) {
                ;
        } else {
            throw new Error("bad type");
        }
    }, function closeRequestHandler(yes, no) {
        yes(); // [5]
    });

