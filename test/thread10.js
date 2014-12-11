importScripts("../lib/Thread.js");

var memory = "";

var thread = new Thread("", function(key, value, postback, event) {
        memory += value;

        thread.post(key, memory, postback);

    }, function(ready, cancel) {
        ready();
    });

