importScripts("../lib/Thread.js");

throw new Error("lol"); // [1]

var thread = new Thread("", function(key, value, postback, event) {
        thread.post(key, value + " WORLD", postback);
    }, function(ready, cancel) {
    });

