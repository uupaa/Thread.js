// Thread test

onmessage = function(event) {
    self.unitTest = event.data; // { message, setting: { secondary, baseDir } }

    if (!self.console) { // polyfill WebWorkerConsole
        self.console = function() {};
        self.console.dir = function() {};
        self.console.log = function() {};
        self.console.warn = function() {};
        self.console.error = function() {};
        self.console.table = function() {};
    }

    importScripts("../lib/WebModule.js");

    importScripts("../node_modules/uupaa.task.js/lib/Task.js");
    importScripts("../node_modules/uupaa.messagepack.js/node_modules/uupaa.utf8.js/lib/UTF8.js");
    importScripts("../node_modules/uupaa.messagepack.js/lib/MessagePack.js");
    importScripts("wmtools.js");
    importScripts("../lib/Thread.js");
    importScripts("../lib/ThreadProxy.js");
    importScripts("../lib/ThreadPool.js");
    importScripts("../release/Thread.w.min.js");
    importScripts("testcase.js");

    self.postMessage(self.unitTest);
};

