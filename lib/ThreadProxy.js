(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("ThreadProxy", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------

// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function ThreadProxy(postMessageHandler,    // @arg Function - post message handler. postMessageHandler(args:Any, event:Event):void
                     closeRequestHandler) { // @arg Function - close request handler. closeRequestHandler(yes:Function, no:Function):void
//{@dev
    $valid($type(postMessageHandler,  "Function|omit"), ThreadProxy, "postMessageHandler");
    $valid($type(closeRequestHandler, "Function|omit"), ThreadProxy, "closeRequestHandler");
    if (!IN_WORKER) {
        throw new TypeError("wrong use case");
    }
//}@dev

    function _yes() { global["postMessage"]("YES"); } // [3]
    function _no()  { global["postMessage"]("NO");  } // [4]

    global["onmessage"] = function(event) { // @arg Event - event.data
        var data = event["data"]; // POST MESSAGE: { pbid, args } or
                                  // SYSTEM COMMAND: "INIT" or "INIT_X" or "CLOSE_REQUEST"
        switch (data) {
        case "INIT":            break;
        case "CLOSE_REQUEST":   closeRequestHandler(_yes, _no); break; // Don't stop a long time in this scope. Because watchdog will trigger.
        default:                event["postback"] = Event_postback; // add event.postback method
                                postMessageHandler(data["args"] || [], event);
        }
    };
}

ThreadProxy["prototype"] = Object.create(ThreadProxy, {
    "constructor":  { "value": ThreadProxy          }, // new ThreadProxy(postMessageHandler:Function, closeRequestHandler:Function):ThreadProxy
    "post":         { "value": ThreadProxy_post     }, // ThreadProxy#post(args:Any = null, transfer:TransferableObjectArray = null, event:Event = null):void
    "close":        { "value": ThreadProxy_close    }, // ThreadProxy#close():void
});

// --- implements ------------------------------------------
function Event_postback(args,       // @arg Any = null
                        transfer) { // @arg TransferableObjectArray = null
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(args,     "Array|omit"),                   Event_postback, "args");
        $valid($type(transfer, "TransferableObjectArray|omit"), Event_postback, "transfer");
    }
//}@dev

    var pbid = this["data"]["pbid"]; // postback id

    if (transfer) {
        global["postMessage"]({ "pbid": pbid, "args": args }, transfer);
    } else {
        global["postMessage"]({ "pbid": pbid, "args": args });
    }
}

function ThreadProxy_post(args,       // @arg Any = null
                          transfer) { // @arg TransferableObjectArray = null - [ArrayBuffer, CanvasPorxy, MessagePort, ...]
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(args,     "Any|omit"),                     ThreadProxy_post, "args");
        $valid($type(transfer, "TransferableObjectArray|omit"), ThreadProxy_post, "transfer");
    }
//}@dev

    if (transfer) {
        global["postMessage"]({ "args": args }, transfer);
    } else {
        global["postMessage"]({ "args": args });
    }
}

function ThreadProxy_close() {
    global["postMessage"]("SELF_CLOSE"); // [6] send a "SELF_CLOSE" message to Thread
    global["close"]();                   // terminates the worker
}

return ThreadProxy; // return entity

});

