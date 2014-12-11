importScripts("../lib/Thread.js");

var thread = new Thread("", function(key, value, postback, event) {
        var buffer = new Uint8Array(value);

        buffer[0] *= 2;
        buffer[1] *= 2;
        buffer[2] *= 2;

        thread.post(key, buffer.buffer, postback, [buffer.buffer]);
    }, function(ready, cancel) {
        ready();
    });

