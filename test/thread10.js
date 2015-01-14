importScripts("../lib/Thread.js");

var memory = "";

var thread = new Thread("", function(event, key, value) {
        memory += value;

        thread.post(event, key, memory);

    }, function(yes, no) {
        yes();
    });

