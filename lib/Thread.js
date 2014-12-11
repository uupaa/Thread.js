(function(global) {
"use strict";

// Transferable objects
//  http://www.w3.org/html/wg/drafts/html/master/infrastructure.html#transferable-objects

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
var _runOnWorker = "WorkerLocation" in global;
var _runOnBrowser = "document" in global;

var EXIT_OK      = 0; // Safely closed.
var EXIT_ERROR   = 1; // Error in worker thread.
var EXIT_FORCE   = 2; // Forced termination by user.
var EXIT_TIMEOUT = 3; // Watchdog barked.

// --- class / interfaces ----------------------------------
function Thread(workerScript,  // @arg URLString = "" - new Workers(workerScript)
                handleMessage, // @arg Function - handleMessage(key:UINT32, value:Any, postback:UINT32, event:Event):void
                handleClose) { // @arg Function - handleClose(exitCode:Integer, errorMessage:String):void in MainThread
                               //              or handleClose(ready:Function, cancel:Function):void in WorkerThread
//{@dev
    $valid($type(workerScript,  "URLString|omit"), Thread, "workerScript");
    if (_runOnBrowser) {
        $valid($type(handleMessage, "Function|omit"), Thread, "handleMessage");
        $valid($type(handleClose,   "Function|omit"), Thread, "handleClose");
    } else if (_runOnWorker) {
        $valid($type(handleMessage, "Function"), Thread, "handleMessage");
        $valid($type(handleClose,   "Function"), Thread, "handleClose");
    }
//}@dev
    var that = this;

    if (_runOnBrowser) {
        this._postback = {}; // { id: function, ... }
        this._handleClose = handleClose;
        this._watchdogTimer = 0;
        this._postbackCounter = 0;

        // One side messaging.
        //      thread(port2) --o--> main(port1)
        //      main(port1)   --x--> thread(port2)
        this._messageChannel = new MessageChannel();
        this._messageChannel["port1"]["onmessage"] = function(event) {
            if (event.data === "WORKER_CLOSE_READY" || // [3] Thread#close() in MainThread
                event.data === "CLOSED") {             // [6] Thread#close() in WorkerThread
                _close(that, EXIT_OK);
            } else if (event.data === "WORKER_CLOSE_CANCEL") { // [4]
                _clearWatchdogTimer(that);
            } else {
                var id = event.data["postback"] || 0; // retrieve postback id

                if (id) {
                    that._postback[id](event.data["key"], event.data["value"], id, event);
                    that._postback[id] = null;
                } else {
                    if (handleMessage) {
                        handleMessage(event.data["key"], event.data["value"], 0, event);
                    }
                }
            }
        };
        this._worker = new Worker(workerScript);
        this._worker["onerror"] = function(error) {
            _close(that, EXIT_ERROR, error.message);
        };
        this._worker["postMessage"]("INIT", [this._messageChannel["port2"]]);
    } else if (_runOnWorker) {
        global["onmessage"] = function(event) { // event.data = COMMAND or { key, value, postback }
            if (event.data === "INIT") {
                global["MESSAGE_PORT2"] = event["ports"][0]; // messageChannel.port2
            } else if (event.data === "CLOSE") {
                // When stopped too long time in this scope, watchdog will trigger.
                // 長時間停止させているとwatchdogによりWorkerが殺されます
                if (handleClose) {
                    handleClose(function() { // ready
                        global["MESSAGE_PORT2"]["postMessage"]("WORKER_CLOSE_READY");  // [3]
                    }, function() { // cancel
                        global["MESSAGE_PORT2"]["postMessage"]("WORKER_CLOSE_CANCEL"); // [4]
                    });
                }
            } else { // MainThread.postMessage({ key, value, postback })
                if (handleMessage) {
                    handleMessage(event.data["key"],
                                  event.data["value"],
                                  event.data["postback"] || 0, event);
                }
            }
        };
    }
}

//{@dev
Thread["repository"] = "https://github.com/uupaa/Thread.js";
//}@dev

Thread["prototype"]["post"]  = Thread_post;  // Thread#post(key:UINT32, value:Any,
                                             //             postback:Function|UINT32 = 0,
                                             //             transfer:TransferableObjectArray = null):void
Thread["prototype"]["close"] = Thread_close; // Thread#close(timeout:Integer = 10000):void

if (_runOnBrowser) {
    Thread["prototype"]["isAlive"] = Thread_isAlive; // Thread#isAlive():Boolean
    Thread["OK"]      = EXIT_OK;
    Thread["ERROR"]   = EXIT_ERROR;
    Thread["FORCE"]   = EXIT_FORCE;
    Thread["TIMEOUT"] = EXIT_TIMEOUT;
}

// Blink has the bug - https://code.google.com/p/chromium/issues/detail?id=334408
// Issue 334408: ArrayBuffer is lost in MessageChannel during postMessage (receiver's event.data == null)
Thread["ALLOW_TRANSFERABLE_OBJECT"] = false;

// --- implements ------------------------------------------
function Thread_post(key,        // @arg UINT32
                     value,      // @arg Any
                     postback,   // @arg Function|UINT32 = 0 - postback function or postback id,
                                 //                            function callback is postback(key:UINT32, value:Any, postback:UINT32, event:Event):void
                     transfer) { // @arg TransferableObjectArray = null - [ArrayBuffer, CanvasPorxy, MessagePort, ...]
//{@dev
    $valid($type(key,      "UINT32"), Thread, "key");
    $valid($type(value,    "Any"),    Thread, "value");
    $valid($type(postback, _runOnBrowser ? "Function|omit"
                                         : "UINT32|omit"),  Thread_post, "postback");
    $valid($type(transfer, "TransferableObjectArray|omit"), Thread_post, "transfer");
//}@dev

    var id    = 0; // UINT32
    var port  = _runOnWorker  ? global["MESSAGE_PORT2"] : this._worker;
    var allow = _runOnBrowser ? true : Thread["ALLOW_TRANSFERABLE_OBJECT"];

    if (_runOnBrowser) {
        if (postback) { // postback function.
            if (this._postbackCounter >= 0xffffffff) {
                this._postbackCounter = 0;
            }
            id = ++this._postbackCounter;
            this._postback[id] = postback; // register postback
        }
    } else if (_runOnWorker) {
        id = postback;
    }
    if (transfer && allow) {
        port["postMessage"]({ "key": key, "value": value, "postback": id }, transfer);
    } else {
        port["postMessage"]({ "key": key, "value": value, "postback": id });
    }
}

function Thread_close(timeout) { // @arg Integer = 10000 - watch dog timer, -1 is force close.
    var that = this;

    if (_runOnBrowser) {
        //  - [1] set watch dog timer
        //  - [2] send a "CLOSE" message to WorkerThread
        //      - [3] response a "WORKER_CLOSE_READY" message from WorkerThread
        //          - stop watch dog timer
        //          - clear MessageChannel
        //          - close worker
        //      - [4] response a "WORKER_CLOSE_CANCEL" message from WorkerThread
        //          - stop watch dog timer
        //      - [5] ... no response... what's happen? -> fire watch dog timer
        //          - stop watch dog time
        //          - close MessageChannel
        //          - close worker
        if (timeout === -1) { // force close
            _close(that, EXIT_FORCE);
        } else if (!that._watchdogTimer) {
            that._watchdogTimer = setTimeout(function() { // [1]
                _close(that, EXIT_TIMEOUT);
            }, timeout || 10000);
            that._worker["postMessage"]("CLOSE"); // [2]
        }
    } else if (_runOnWorker) {
        // - [6] send a "closed" message to MainThread
        global["MESSAGE_PORT2"]["postMessage"]("CLOSED");
        global["close"](); // terminates the worker
    }
}

function Thread_isAlive() { // @ret Boolean
    return !!this._worker;
}
function _close(that, exitCode, errorMessage) {
    // [5]
    _clearWatchdogTimer(that);
    _closeMessageChannel(that);
    _closeWorker(that);
    if (that._handleClose) {
        that._handleClose(exitCode, errorMessage || "");
        that._handleClose = null;
    }
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
if ("process" in global) {
    module["exports"] = Thread;
}
global["Thread" in global ? "Thread_" : "Thread"] = Thread; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

