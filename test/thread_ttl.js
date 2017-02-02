importScripts("../lib/WebModule.js");
importScripts("../lib/ThreadProxy.js");

var proxy = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        event.postback([ "HELLO WORLD 1" ]); // [2]
        event.postback([ "HELLO WORLD 2" ]); // [3]
        event.postback([ "HELLO WORLD 3" ]); // [4]
        event.postback([ "HELLO WORLD 4" ]); // [5]
    }, function closeRequestHandler(yes, no) {
        yes();
    });

