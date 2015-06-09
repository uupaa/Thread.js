# Thread.js [![Build Status](https://travis-ci.org/uupaa/Thread.js.svg)](https://travis-ci.org/uupaa/Thread.js)

[![npm](https://nodei.co/npm/uupaa.thread.js.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.thread.js/)

Thread and ThreadPool functions.


- Thread.js made of [WebModule](https://github.com/uupaa/WebModule).
- [Spec](https://github.com/uupaa/Thread.js/wiki/Thread)

## Browser and NW.js(node-webkit)


### Browser and node-webkit

```js
// thread.html

<script src="<module-dir>/lib/WebModule.js"></script>
<script src="<module-dir>/lib/Thread.js"></script>
<script>

var thread = new WebModule.Thread("worker.js", function postMessageHandler(args) {
        ;
    }, function(exitCode) {

        switch (exitCode) {
        case Thread.EXIT_OK: console.log("Closed."); break;
        case Thread.EXIT_ERROR: console.log("Terminates with an error from WorkerThread. " + errorMessage); break;
        case Thread.EXIT_FORCE: console.log("Forced termination by user."); break;
        case Thread.EXIT_TIMEOUT: console.log("Watchdog barked.");
        }
    });

thread.post(["HELLO", 123], null, function postbackMessageHandler(args) {
    console.log(args[0]); // "HELLO WORLD"
    thread.close();
});

</script>
```

## WebWorkers

```js
// worker.js

importScripts("<module-dir>lib/WebModule.js");
importScripts("<module-dir>lib/ThreadProxy.js");

var thread = new WebModule.ThreadProxy(function postMessageHandler(args, event) {
        console.log(args[0]); // "HELLO"
        console.log(args[1]); // 123

        event.postback(args[0] + " WORLD"); // call to postbackMessageHandler

    }, function closeRequestHandler(yes, ng) {
        // .... destruction process...

        yes(); // -> closed as usual.
    });

```

