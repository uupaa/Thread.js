importScripts("../node_modules/uupaa.codec.js/lib/Codec.js");
importScripts("../node_modules/uupaa.codec.js/lib/MessagePack.js");
importScripts("../lib/Thread.js");

var thread = new Thread("", function(event, key, value) {
        var obj = Codec.MessagePack.decode(new Uint8Array(value));

        obj.msg += " WORLD";
        obj.date2 = new Date();
        obj.data.set([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

        var packed = Codec.MessagePack.encode(obj);

        thread.post(event, key, packed.buffer, [packed.buffer]);
    }, function(ready, cancel) {
        ready();
    });
