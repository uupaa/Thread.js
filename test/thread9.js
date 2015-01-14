importScripts("../lib/Thread.js");

var thread = new Thread("", function(event, key, value) {
        var u8 = new Uint8Array(value);

        u8[0] *= 2;
        u8[1] *= 2;
        u8[2] *= 2;

        thread.post(event, key, u8.buffer, [u8.buffer]);
    }, function(yes, no) {
        yes();
    });

