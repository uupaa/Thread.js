(function(global) {
"use strict";

// Transferable objects
//  http://www.w3.org/html/wg/drafts/html/master/infrastructure.html#transferable-objects

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
var _isNodeOrNodeWebKit = !!global.global;
var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var EXIT_OK      = 0; // Safely closed.
var EXIT_ERROR   = 1; // Error in worker thread.
var EXIT_FORCE   = 2; // Forced termination by user.
var EXIT_TIMEOUT = 3; // Watchdog barked.

function NOP() {}; // no operation

// --- class / interfaces ----------------------------------
function Thread(script,        // @arg URLString - Workers script or ""
                handlePost,    // @arg Function = null - handlePost(event:Event, key:Any, value:Any):void
                handleClose) { // @arg Function = null - handleClose(exitCode:Integer):void in MainThread
                               //                     or handleClose(ready:Function, cancel:Function):void in WorkerThread
//{@dev
    $valid($type(script,      "URLString"),     Thread, "script");
    $valid($type(handlePost,  "Function|omit"), Thread, "handlePost");
    $valid($type(handleClose, "Function|omit"), Thread, "handleClose");
//}@dev

    if (_runOnBrowser || _runOnNodeWebKit) {
        var that = this;

        this._postback = { counter: new Uint32Array(1) }; // { postback-id: function, ... }
        this._handlePost    = handlePost  || NOP;
        this._handleClose   = handleClose || NOP;
        this._watchdogTimer = 0;

        this._messageChannel = new MessageChannel();
        this._messageChannel["port1"]["onmessage"] = _handleEventInMainThread.bind(this);

        this._worker = new Worker(script);
        this._worker["onerror"] = function( o___o ) { _close(that, EXIT_ERROR, o___o.message); };
        this._worker["postMessage"]("INIT", [ this._messageChannel["port2"] ]);
    } else {
        this._handlePost    = handlePost  || NOP;
        this._handleClose   = handleClose || NOP;
        global["onmessage"] = _handleEventInWorkerThread.bind(this);
    }
}

//{@dev
Thread["repository"] = "https://github.com/uupaa/Thread.js";
//}@dev

if (_runOnBrowser || _runOnNodeWebKit) {
    Thread["OK"]      = EXIT_OK;
    Thread["ERROR"]   = EXIT_ERROR;
    Thread["FORCE"]   = EXIT_FORCE;
    Thread["TIMEOUT"] = EXIT_TIMEOUT;
    Thread["prototype"]["post"]    = MainThread_post;   // Thread#post(event:Event, key:Any, value:Any, transfer:TransferableObjectArray = null, fn:Function = null):void
    Thread["prototype"]["close"]   = MainThread_close;  // Thread#close(timeout:Integer = 10000):void
    Thread["prototype"]["isAlive"] = function() { return !!this._worker; };
} else {
    Thread["prototype"]["post"]    = WorkerThread_post; // Thread#post(event:Event, key:Any, value:Any, transfer:TransferableObjectArray = null):void
    Thread["prototype"]["close"]   = WorkerThread_close;// Thread#close():void
}

// --- implements ------------------------------------------
function _handleEventInMainThread(event) { // @arg Event
                                           // @bound this
    var data = event.data; // { id, key, value } or COMMAND

    switch (data) {
    case "CLOSED":                                      // [6]
    case "READY":   _close(this, EXIT_OK);     break;   // [3]
    case "CANCEL":  _clearWatchdogTimer(this); break;   // [4]
    default:
        var id = data["id"] || 0; // postback id
        if (id) {
            if (this._postback[id]) {
                this._postback[id](event, data["key"], data["value"]);
                this._postback[id] = null;
            }
        } else {
            this._handlePost(event, data["key"], data["value"]);
        }
    }
}
function _ready()  { global["PORT2"]["postMessage"]("READY");  } // [3]
function _cancel() { global["PORT2"]["postMessage"]("CANCEL"); } // [4]
function _handleEventInWorkerThread(event) { // @arg Event
                                             // @bound this
    var data = event.data; // { id, key, value } or COMMAND

    switch (data) {
    case "INIT":    global["PORT2"] = event["ports"][0]; break; // export messageChannel.port2
    case "CLOSE":   this._handleClose(_ready, _cancel);  break; // Don't stop a long time in this scope. Because watchdog will trigger.
    default:        this._handlePost(event, data["key"], data["value"]);
    }
}

function MainThread_post(event,    // @arg Event|null
                         key,      // @arg Any - keyword
                         value,    // @arg Any - value
                         transfer, // @arg TransferableObjectArray = null - [ArrayBuffer, CanvasPorxy, MessagePort, ...]
                         fn) {     // @arg Function = null - postback function
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(event,    "Event|null"),                   MainThread_post, "event");
        $valid($type(transfer, "TransferableObjectArray|omit"), MainThread_post, "transfer");
        $valid($type(fn,       "Function|omit"),                MainThread_post, "fn");
    }
//}@dev

    var id = 0;

    if (fn) {
        id = ++this._postback.counter[0];
        this._postback[id] = fn; // register postback function.
    }
    if (transfer) {
        this._worker["postMessage"]({ "id": id, "key": key, "value": value }, transfer);
    } else {
        this._worker["postMessage"]({ "id": id, "key": key, "value": value });
    }
}
function WorkerThread_post(event,      // @arg Event
                           key,        // @arg Any - keyword
                           value,      // @arg Any - value
                           transfer) { // @arg TransferableObjectArray = null - [ArrayBuffer, CanvasPorxy, MessagePort, ...]
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(event,    "Event"),                        WorkerThread_post, "event");
        $valid($type(transfer, "TransferableObjectArray|omit"), WorkerThread_post, "transfer");
    }
//}@dev

    var id = event.data["id"] || 0; // postback id

    // Blink has the big bug - https://code.google.com/p/chromium/issues/detail?id=334408
    // Issue 334408: ArrayBuffer is lost in MessageChannel during postMessage (receiver's event.data == null)
    var ALLOW_TRANSFERABLE_OBJECT = false;

    if (transfer && ALLOW_TRANSFERABLE_OBJECT) {
        global["PORT2"]["postMessage"]({ "id": id, "key": key, "value": value }, transfer);
    } else {
        global["PORT2"]["postMessage"]({ "id": id, "key": key, "value": value });
    }
}

function MainThread_close(timeout) { // @arg Integer = 10000 - watch dog timer, -1 is force close.
    //  - [1] set watch dog timer
    //  - [2] send a "CLOSE" message to WorkerThread
    //      - [3] response a "READY" message from WorkerThread
    //          - stop watch dog timer
    //          - clear MessageChannel
    //          - close worker
    //      - [4] response a "CANCEL" message from WorkerThread
    //          - stop watch dog timer
    //      - [5] ... no response... what's happen? -> fire watch dog timer
    //          - stop watch dog time
    //          - close MessageChannel
    //          - close worker
    if (timeout === -1) { // force close
        _close(this, EXIT_FORCE);
    } else if (!this._watchdogTimer) {
        var that = this;
        this._watchdogTimer = setTimeout(function() { // [1]
            _close(that, EXIT_TIMEOUT);
        }, timeout || 10000);
        this._worker["postMessage"]("CLOSE"); // [2]
    }
}
function WorkerThread_close() {
    global["PORT2"]["postMessage"]("CLOSED"); // [6] send a "closed" message to MainThread
    global["close"]();                        // terminates the worker
}

function _close(that, exitCode, errorMessage) { // [5]
    _clearWatchdogTimer(that);
    _closeMessageChannel(that);
    _closeWorker(that);
    that._handleClose(exitCode, errorMessage || "");
    that._handleClose = NOP;
}
function _clearWatchdogTimer(that) {
    if (that._watchdogTimer) {
        clearTimeout(that._watchdogTimer);
        that._watchdogTimer = 0;
    }
}
function _closeMessageChannel(that) {
    that._messageChannel["port1"]["close"]();
    that._messageChannel["port2"]["close"]();
    that._messageChannel = null;
}
function _closeWorker(that) {
    that._worker["terminate"]();
    that._worker = null;
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Thread;
}
global["Thread" in global ? "Thread_" : "Thread"] = Thread; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

