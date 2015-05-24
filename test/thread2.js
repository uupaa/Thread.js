importScripts("../lib/WebModuleGlobal.js");
importScripts("../lib/Thread.js");

var thread = new Thread("", function(event, key, value) {
        thread.post(event, key, value + " WORLD");
    }, function(yes, no) {
      //ready();
        no(); // [2]
    });

