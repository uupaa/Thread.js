importScripts("../lib/Thread.js");

var thread = new Thread("", function(event, key, value) {
        thread.post(event, key, value + " WORLD"); // [2]
    }, function(ready, cancel) {
        ready(); // [5]
    });

