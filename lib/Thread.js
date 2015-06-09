(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("Thread", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function Thread(script,                // @arg URLString - Workers script
                postMessageHandler,    // @arg Function = null - post message handler. postMessageHandler(args:AnyArray, event:Event):void
                closeMessageHandler) { // @arg Function = null - close message handler. closeMessageHandler(exitCode:Integer):void
//{@dev
    $valid($type(script,              "URLString"),     Thread, "script");
    $valid($type(postMessageHandler,  "Function|omit"), Thread, "postMessageHandler");
    $valid($type(closeMessageHandler, "Function|omit"), Thread, "closeMessageHandler");
    if ( !(IN_BROWSER || IN_NW) ) {
        throw new TypeError("wrong use case");
    }
//}@dev

    var that = this;

    this._postHandler   = postMessageHandler  || function() {}; // post message handler.
    this._closeHandler  = closeMessageHandler || function() {}; // close message handler.
    this._watchdogTimer = 0;
    this._postbackCounter = 0;   // postback message handler counter.
    this._postbackHandlers = {}; // postback message handlers. { postback-id: postback-handler, ... }

    this._messageChannel = new MessageChannel();
    this._messageChannel["port1"]["onmessage"] = Thread_onmessage.bind(this); // Message from ThreadProxy
    this._worker = new Worker(script); // WebWorkers API
    this._worker["onerror"] = function(err) { _close(that, Thread["EXIT_ERROR"], err.message); };
    this._worker["postMessage"](Thread["TRANSFERBLE"] ? "INIT" : "INIT_X", [ this._messageChannel["port2"] ]);
}

// --- Transferable objects ---
// http://www.w3.org/html/wg/drafts/html/master/infrastructure.html#transferable-objects
Thread["TRANSFERBLE"]  = false; // allow transferble object in MessageChannel.

// --- exit code ---
Thread["EXIT_OK"]      = 0; // Safely closed.
Thread["EXIT_ERROR"]   = 1; // Error in worker thread.
Thread["EXIT_FORCE"]   = 2; // Forced termination by user.
Thread["EXIT_TIMEOUT"] = 3; // Watchdog barked.

Thread["VERBOSE"]      = false; // verbose mode.
Thread["repository"]   = "https://github.com/uupaa/Thread.js";
Thread["prototype"] = Object.create(Thread, {
    "constructor":  { "value": Thread       }, // new Thread(script:URLString, postMessageHandler:Function, closeMessageHandler:Function):Thread
    "post":         { "value": Thread_post  }, // Thread#post(args:AnyArray = null, transfer:TransferableObjectArray = null, postbackMessageHandler:Function = null):void
    "close":        { "value": Thread_close }, // Thread#close(timeout:Integer = 10000):void
    "active": {
        "get": function() { return !!this._worker; }
    }
});

// --- implements ------------------------------------------
function Thread_post(args,                     // @arg AnyArray = null - arguments
                     transfer,                 // @arg TransferableObjectArray = null - [ArrayBuffer, CanvasPorxy, MessagePort, ...]
                     postbackMessageHandler) { // @arg Function = null - postback message handler. postbackMessageHandler(args:AnyArray, event:Event):void
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(args,                   "Array|omit"),                   Thread_post, "args");
        $valid($type(transfer,               "TransferableObjectArray|omit"), Thread_post, "transfer");
        $valid($type(postbackMessageHandler, "Function|omit"),                Thread_post, "postbackMessageHandler");
    }
//}@dev

    var pbid = !postbackMessageHandler ? 0 : ++this._postbackCounter;

    if (pbid) {
        this._postbackHandlers[pbid] = postbackMessageHandler; // register postback message handler.
    }
    if (transfer) {
        this._worker["postMessage"]({ "pbid": pbid, "args": args }, transfer);
    } else {
        this._worker["postMessage"]({ "pbid": pbid, "args": args });
    }
}

function Thread_onmessage(event) { // @arg Event
                                   // @bind this
    var data = event["data"]; // POST MESSAGE: { pbid, args } or
                              // SYSTEM COMMAND: "SELF_CLOSE" or "YES" or "NO"
    switch (data) {
    case "SELF_CLOSE":                                   // [6]
    case "YES": _close(this, Thread["EXIT_OK"]); break;  // [3]
    case "NO":  _clearWatchdogTimer(this);  break;       // [4]
    default:
        var pbid = data["pbid"] || 0; // postback id
        if (pbid) {
            if (this._postbackHandlers[pbid]) {
                this._postbackHandlers[pbid](data["args"] || [], event); // call postback message handler
                this._postbackHandlers[pbid] = null;
            } else if (Thread["VERBOSE"]) {
                console.log("Lost message:" + pbid);
            }
        } else {
            this._postHandler(data["args"] || [], event); // call post message handler
        }
    }
}

function Thread_close(timeout) { // @arg Integer = 10000 - watch dog timer, -1 is force close.
    //  - [1] set watch dog timer
    //  - [2] send a "CLOSE_REQUEST" message to ThreadProxy
    //      - [3] response a "YES" message from ThreadProxy
    //          - stop watch dog timer
    //          - clear MessageChannel
    //          - close worker
    //      - [4] response a "NO" message from ThreadProxy
    //          - stop watch dog timer
    //      - [5] ... no response... what's happen? -> fire watch dog timer
    //          - stop watch dog time
    //          - close MessageChannel
    //          - close worker
    var that = this;

    if (timeout === -1) { // force close
        _close(that, Thread["EXIT_FORCE"]);
    } else if (!that._watchdogTimer) {
        // --- set watchdog timer ---
        that._watchdogTimer = setTimeout(function() { // [1]
            _close(that, Thread["EXIT_TIMEOUT"]);
        }, timeout || 10000);

        that._worker["postMessage"]("CLOSE_REQUEST"); // [2]
    }
}

function _close(that, exitCode, errorMessage) { // [5]
    _clearWatchdogTimer(that);
    // --- close MessageChannel ---
    that._messageChannel["port1"]["onmessage"] = null;
    that._messageChannel["port1"]["close"]();
    that._messageChannel["port2"]["close"]();
    that._messageChannel = null;
    // --- close worker ---
    that._worker["terminate"]();
    that._worker = null;

    that._closeHandler(exitCode, errorMessage || "");
    that._closeHandler = null;
}
function _clearWatchdogTimer(that) {
    if (that._watchdogTimer) {
        clearTimeout(that._watchdogTimer);
        that._watchdogTimer = 0;
    }
}

// --- environment detection -------------------------------------------
function _hasMessageChannelBug() {
    // Blink has the big bug - https://code.google.com/p/chromium/issues/detail?id=334408
    // Issue 334408: ArrayBuffer is lost in MessageChannel during postMessage (receiver's event.data == null)
    var ch = new MessageChannel(), ab = new ArrayBuffer(8);

    ch.port1.onmessage = function(event) {
        Thread["TRANSFERBLE"] = event.data && event.data.byteLength === 8;
    };
    ch.port2.postMessage(ab, [ab]); // Transferable
}

if (IN_BROWSER || IN_NW) {
    _hasMessageChannelBug();
}

return Thread; // return entity

});

