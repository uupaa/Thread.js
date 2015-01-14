importScripts("../lib/Thread.js");

var thread = new Thread("", function(event, key, value) {
        thread.post(event, key, value + " WORLD");
    }, function(yes, no) {
        throw new Error("lol"); // [1]
    });

