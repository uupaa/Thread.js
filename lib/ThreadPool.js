(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("ThreadPool", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function ThreadPool(threads) { // @arg ThreadArray = [] - [thread, ...]
//{@dev
    $valid($type(threads, "Array|omit"), ThreadPool, "threads");
//}@dev

    this._threads = threads || []; // thread pool. [thread, ...]
    this._roundRobinCounter = 0;
}

ThreadPool["repository"] = "https://github.com/uupaa/Thread.js";
ThreadPool["prototype"] = {
    "constructor":  ThreadPool,        // new ThreadPool(threads:ThreadArray = []):ThreadPool
    "post":         ThreadPool_post,   // ThreadPool#post(args:AnyArray, postback:Function = null, transfer:TransferableObjectArray = null):void
    "add":          ThreadPool_add,    // ThreadPool#add(thread:Thread):this
    "remove":       ThreadPool_remove, // ThreadPool#remove(thread:Thread):this
    "clear":        ThreadPool_clear   // ThreadPool#clear():void
};

// --- implements ------------------------------------------
function ThreadPool_clear() {
    this._threads = [];
    this._roundRobinCounter = 0;
}

function ThreadPool_post(args,      // @arg AnyArray
                         transfer,  // @arg TransferableObjectArray = null
                         handler) { // @arg Function = null - individual postback event handler. handler(event:Event, args):void
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(transfer, "TransferableObjectArray|omit"), ThreadPool_post, "transfer");
        $valid($type(handler,   "Function|omit"),               ThreadPool_post, "handler");
    }
//}@dev

    var activeThreads = _enumActiveThreads(this._threads);

    if (!activeThreads.length) {
        throw new Error("No active thread");
    }
    var counter = this._roundRobinCounter++ & 0xffff;
    var thread = activeThreads[counter % activeThreads.length]; // choice active thread

    thread["post"](args, transfer, handler);
}

function _enumActiveThreads(pool) {
    var result = [];

    for (var i = 0, iz = pool.length; i < iz; ++i) {
        if (pool[i]["active"]) {
            result.push(pool[i]);
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
    } else if (thread["active"]) { // is active?
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

return ThreadPool; // return entity

});

