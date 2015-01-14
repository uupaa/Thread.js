importScripts("../lib/Thread.js");

var thread = new Thread("", function(event, key, value) {
        thread.post(event, key, value + " WORLD");
    }, function(ready, cancel) {
      //ready();
      //cancel();
      // [2]
    });

