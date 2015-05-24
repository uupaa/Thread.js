importScripts("../lib/WebModuleGlobal.js");
importScripts("../lib/Thread.js");

/*
var thread = new Thread("", function(key, value, postback, event) {
        thread.post(key, value + " WORLD", postback); // [2]
    }, function(yes, no) {
        yes(); // [5]
    });
 */
var thread = new Thread("", function(event, key, value) {
        thread.post(event, key, value + " WORLD"); // [2]
    }, function(yes, no) {
        yes(); // [5]
    });

