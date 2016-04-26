(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("ThreadPool", function moduleClosure(global, WebModule, VERIFY /*, VERBOSE */) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function ThreadPool(threads) { // @arg ThreadArray = [] - [thread, ...]
//{@dev
    if (VERIFY) {
        $valid($type(threads, "Array|omit"), ThreadPool, "threads");
    }
//}@dev

    this._threads = threads || []; // thread pool. [thread, ...]
    this._roundRobinCounter = 0;
}

ThreadPool["prototype"] = Object.create(ThreadPool, {
    "constructor":  { "value": ThreadPool        }, // new ThreadPool(threads:ThreadArray = []):ThreadPool
    "post":         { "value": ThreadPool_post   }, // ThreadPool#post(args:Any = null, transfer:TransferableObjectArray = null, postbackMessageHandler:Function = null):void
    "add":          { "value": ThreadPool_add    }, // ThreadPool#add(thread:Thread):this
    "remove":       { "value": ThreadPool_remove }, // ThreadPool#remove(thread:Thread):this
    "clear":        { "value": ThreadPool_clear  }, // ThreadPool#clear():void
});

// --- implements ------------------------------------------
function ThreadPool_clear() {
    this._threads = [];
    this._roundRobinCounter = 0;
}

function ThreadPool_post(args,                     // @arg AnyArray
                         transfer,                 // @arg TransferableObjectArray = null
                         postbackMessageHandler) { // @arg Function = null - postback message handler. postbackMessageHandler(args:Any, event:Event):void
//{@dev
    if (VERIFY) {
        $valid($type(args,                   "Any|omit"),                     ThreadPool_post, "args");
        $valid($type(transfer,               "TransferableObjectArray|omit"), ThreadPool_post, "transfer");
        $valid($type(postbackMessageHandler, "Function|omit"),                ThreadPool_post, "postbackMessageHandler");
    }
//}@dev

    var activeThreads = _enumActiveThreads(this._threads);

    if (!activeThreads.length) {
        throw new Error("No active thread");
    }
    var counter = this._roundRobinCounter++ & 0xffff;
    var thread = activeThreads[counter % activeThreads.length]; // choice active thread

    thread["post"](args, transfer, postbackMessageHandler);
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
    if (VERIFY) {
        $valid($type(thread, "Thread"), ThreadPool_add, "thread");
    }
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
    if (VERIFY) {
        $valid($type(thread, "Thread"), ThreadPool_remove, "thread");
    }
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

