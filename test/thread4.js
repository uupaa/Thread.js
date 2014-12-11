importScripts("../lib/Thread.js");

var thread = new Thread("", function(key, value, postback, event) {
        thread.post(key, value + " WORLD", postback);
    }, function(ready, cancel) {
        throw new Error("lol"); // [1]
    });

