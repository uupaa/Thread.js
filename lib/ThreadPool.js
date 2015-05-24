(function moduleExporter(moduleName, moduleBody) { // http://git.io/WebModule
   "use strict";

    var alias  = moduleName in GLOBAL ? (moduleName + "_") : moduleName; // switch
    var entity = moduleBody(GLOBAL);

    if (typeof modules !== "undefined") {
        GLOBAL["modules"]["register"](alias, moduleBody, entity["repository"]);
    }
    if (typeof exports !== "undefined") {
        module["exports"] = entity;
    }
    GLOBAL[alias] = entity;

})("ThreadPool", function moduleBody(global) {

"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function ThreadPool(threads) { // @arg ThreadArray = [] - [thread, ...]
//{@dev
    $valid($type(threads, "Array|omit"), ThreadPool, "threads");
//}@dev

    this._threads = threads || []; // [thread, ...]
    this._roundRobinCounter = 0;
}

ThreadPool["repository"] = "https://github.com/uupaa/Thread.js";
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
    var counter = this._roundRobinCounter++ & 0xffff;
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

// --- validate and assert functions -----------------------
//{@dev
  function $type(obj, type)      { return GLOBAL["Valid"] ? GLOBAL["Valid"].type(obj, type)    : true; }
//function $keys(obj, str)       { return GLOBAL["Valid"] ? GLOBAL["Valid"].keys(obj, str)     : true; }
//function $some(val, str, ig)   { return GLOBAL["Valid"] ? GLOBAL["Valid"].some(val, str, ig) : true; }
//function $args(fn, args)       { if (GLOBAL["Valid"]) { GLOBAL["Valid"].args(fn, args); } }
  function $valid(val, fn, hint) { if (GLOBAL["Valid"]) { GLOBAL["Valid"](val, fn, hint); } }
//}@dev

return ThreadPool; // return entity

});

