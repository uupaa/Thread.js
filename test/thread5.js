importScripts("../lib/Thread.js");

throw new Error("lol"); // [1]

var thread = new Thread("", function(event, key, value) {
        thread.post(event, key, value + " WORLD");
    }, function(yes, no) {
    });

