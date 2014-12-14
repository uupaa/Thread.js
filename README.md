# Thread.js [![Build Status](https://travis-ci.org/uupaa/Thread.js.png)](http://travis-ci.org/uupaa/Thread.js)

[![npm](https://nodei.co/npm/uupaa.thread.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.thread.js/)

Thread and ThreadPool functions.

## Document

- [Thread.js wiki](https://github.com/uupaa/Thread.js/wiki/Thread)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)

## How to use

### Browser

```js
// thread.html

<script src="lib/Thread.js"></script>
<script>

var thread = new Thread("worker-thread.js", function(key, value, postback, event) {

        console.log(value); // "HELLO WORLD"
        thread.close();

    }, function(exitCode, errorMessage) {

        switch (exitCode) {
        case Thread.OK: // 0
            console.log("Safely closed.");
            break;
        case Thread.ERROR: // 1
            console.log("Terminates with an error from WorkerThread. " + errorMessage);
            break;
        case Thread.FORCE: // 2
            console.log("Forced termination by user.");
            break;
        case Thread.TIMEOUT: // 3
            console.log("Watchdog barked.");
            break;
        }
    });

var key = 123;
var value = "HELLO"

thread.post(key, value);

</script>
```

### WebWorkers

```js
// worker-thread.js

importScripts("lib/Thread.js");

var thread = new Thread("", function(key, value, postback, event) {
        console.log(key);   // 123
        console.log(value); // "HELLO"

        thread.post(key, value + " WORLD");

    }, function(ready, cancel) {
        // .... destruction process...

        ready();  // -> THREAD_CLOSE_READY
      //cancel(); // -> THREAD_CLOSE_CANCEL
    });

```

