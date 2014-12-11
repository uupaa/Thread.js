importScripts("../lib/Thread.js");

var thread = new Thread("", function(key, value, postback, event) {
        thread.post(key, value + " WORLD", postback); // [2]
    }, function(ready, cancel) {
        ready(); // [5]
    });

