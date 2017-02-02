(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("Thread", function moduleClosure(global, WebModule, VERIFY /*, VERBOSE */) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function Thread(script,                // @arg URLString - Workers script
                postMessageHandler,    // @arg Function = null - post message handler. postMessageHandler(args:Any, event:Event):void
                closeMessageHandler) { // @arg Function = null - close message handler. closeMessageHandler(exitCode:Integer):void
//{@dev
    if (VERIFY) {
        $valid($type(script,              "URLString"),     Thread, "script");
        $valid($type(postMessageHandler,  "Function|omit"), Thread, "postMessageHandler");
        $valid($type(closeMessageHandler, "Function|omit"), Thread, "closeMessageHandler");
        if ( !(IN_BROWSER || IN_NW) ) {
            throw new TypeError("wrong use case");
        }
    }
//}@dev

    var that = this;

    this._postHandler   = postMessageHandler  || function() {}; // post message handler.
    this._closeHandler  = closeMessageHandler || function() {}; // close message handler.
    this._watchdogTimer = 0;
    this._postbackCounter = 0;   // postback message handler counter.
    this._postbackHandlerMap = {}; // postback message handlers. { postback-id: { fn: postback-handler, ttl: 1 }, ... }

    this._worker = new Worker(script); // WebWorkers API
    this._worker["onerror"] = function(err) { _close(that, Thread["EXIT_ERROR"], err.message); };
    this._worker["onmessage"] = Thread_onmessage.bind(this);
    this._worker["postMessage"]("INIT");
}

// --- exit code ---
Thread["EXIT_OK"]      = 0; // Safely closed.
Thread["EXIT_ERROR"]   = 1; // Error in worker thread.
Thread["EXIT_FORCE"]   = 2; // Forced termination by user.
Thread["EXIT_TIMEOUT"] = 3; // Watchdog barked.

Thread["VERBOSE"]      = false; // verbose mode.
Thread["repository"]   = "https://github.com/uupaa/Thread.js";
Thread["prototype"] = Object.create(Thread, {
    "constructor":  { "value": Thread       }, // new Thread(script:URLString, postMessageHandler:Function, closeMessageHandler:Function):Thread
    "post":         { "value": Thread_post  }, // Thread#post(args:Any = null, transfer:TransferableObjectArray = null, postbackMessageHandler:Function = null):void
    "close":        { "value": Thread_close }, // Thread#close(timeout:Integer = 10000):void
    "active": {
        "get": function() { return !!this._worker; }
    }
});

// --- implements ------------------------------------------
function Thread_post(args,                   // @arg Any = null - arguments
                     transfer,               // @arg TransferableObjectArray = null - [ArrayBuffer, CanvasPorxy, MessagePort, ...]
                     postbackMessageHandler, // @arg Function = null - postback message handler. postbackMessageHandler(args:Any, event:Event):void
                     ttl) {                  // @arg UINT32 = 1 - Time to Live
//{@dev
    if (VERIFY) {
        $valid($type(args,                   "Any|omit"),                     Thread_post, "args");
        $valid($type(transfer,               "TransferableObjectArray|omit"), Thread_post, "transfer");
        $valid($type(postbackMessageHandler, "Function|omit"),                Thread_post, "postbackMessageHandler");
        $valid($type(ttl,                    "UINT32|omit"),                  Thread_post, "ttl");
    }
//}@dev

    ttl = ttl || 1;

    var pbid = !postbackMessageHandler ? 0 : ++this._postbackCounter;

    if (pbid) {
        this._postbackHandlerMap[pbid] = { fn: postbackMessageHandler, ttl: ttl }; // register postback message handler.
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
            var postbackHandler = this._postbackHandlerMap[pbid];
            if (postbackHandler && postbackHandler.ttl > 0) {
                postbackHandler.fn(data["args"], event); // call postback message handler
                if (--postbackHandler.ttl <= 0) {
                    delete this._postbackHandlerMap[pbid];
                    return;
                }
            }
        }
        this._postHandler(data["args"], event); // call post message handler
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
    // --- close worker ---
    that._worker["onerror"] = null;
    that._worker["onmessage"] = null;
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

return Thread; // return entity

});

