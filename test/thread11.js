importScripts("../lib/WebModule.js");
importScripts("../node_modules/uupaa.messagepack.js/lib/MessagePack.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        var obj = WebModule.MessagePack.decode(new Uint8Array(args[1]));

        obj.msg += " WORLD";
        obj.date2 = new Date();
        obj.data.set([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

        var packed = WebModule.MessagePack.encode(obj);

        event.postback([args[0], packed.buffer], [packed.buffer]);
    }, function(yes, no) {
        yes();
    });

