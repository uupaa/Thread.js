(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

// --- class / interfaces ----------------------------------
function ThreadPool(threads) { // @arg ThreadArray = [] - [thread, ...]
//{@dev
    $valid($type(threads, "ThreadArray|omit"), ThreadPool, "threads");
//}@dev

    this._threads = threads || []; // [thread, ...]
    this._roundRobinCounter = 0;
}

ThreadPool["prototype"] = {
    "constructor":  ThreadPool,        // new ThreadPool(threads:ThreadArray = []):ThreadPool
    "post":         ThreadPool_post,   // ThreadPool#post(key:UINT32, value:Any, postback:Function = null, transfer:TransferableObjectArray = null):void
    "add":          ThreadPool_add,    // ThreadPool#add(thread:Thread):this
    "remove":       ThreadPool_remove, // ThreadPool#remove(thread:Thread):this
    "clear":        ThreadPool_clear   // ThreadPool#clear():void
};

// --- implements ------------------------------------------
function ThreadPool_post(event,    // @arg Event|null
                         key,      // @arg Any - keyword
                         value,    // @arg Any - value
                         transfer, // @arg TransferableObjectArray = null
                         fn) {     // @arg Function = null - postback function.
                                   //      fn(event:Event, key:Any, value:Any):void
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(transfer, "TransferableObjectArray|omit"), ThreadPool_post, "transfer");
        $valid($type(fn,       "Function|omit"),                ThreadPool_post, "postback");
    }
//}@dev

    var activeThreads = _enumActiveThreads(this._threads);

    if (!activeThreads.length) {
        throw new Error("No active thread");
    }
    var counter = ++this._roundRobinCounter & 0xffff;
    var thread = activeThreads[counter % activeThreads.length];

    thread["post"](event, key, value, transfer, fn);
}

function _enumActiveThreads(pool) {
    var result = [];

    for (var i = 0, iz = pool.length; i < iz; ++i) {
        if ( pool[i]["isAlive"]() ) {
            result.push( pool[i] );
        }
    }
    return result;
}

function ThreadPool_add(thread) { // @arg Thread
                                  // @ret this
//{@dev
    $valid($type(thread, "Thread"), ThreadPool_add, "thread");
//}@dev

    if (thread in this._threads) {
        // already exists
    } else {
        this._threads.push(thread);
    }
    return this;
}

function ThreadPool_remove(thread) { // @arg Thread
                                     // @ret this
//{@dev
    $valid($type(thread, "Thread"), ThreadPool_remove, "thread");
//}@dev

    if (thread in this._threads) {
        var pos = this._threads.indexOf(thread);
        if (pos >= 0) {
            this._threads.splice(pos, 1);
        }
    } else {
        // not exists
    }
    return this;
}

function ThreadPool_clear() {
    this._threads = [];
    this._roundRobinCounter = 0;
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }

if (global["Valid"]) {
    global["Valid"]["register"]("ThreadArray", function(type, value) {
        return value.every(function(v) {
            return $type(v, "Thread");
        });
    });
}
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = ThreadPool;
}
global["ThreadPool" in global ? "ThreadPool_" : "ThreadPool"] = ThreadPool; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

