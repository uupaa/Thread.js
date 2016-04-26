var ModuleTestThread = (function(global) {

var Thread       = WebModule.Thread;
var ThreadProxy  = WebModule.ThreadProxy;
var ThreadPool   = WebModule.ThreadPool;
var Task         = WebModule.Task;

var EXIT_OK      = Thread.EXIT_OK;
var EXIT_ERROR   = Thread.EXIT_ERROR;
var EXIT_FORCE   = Thread.EXIT_FORCE;
var EXIT_TIMEOUT = Thread.EXIT_TIMEOUT;

var test = new Test(["Thread"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     false, // enable worker test.
        node:       false, // enable node test.
        nw:         true,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     true,  // show button.
        both:       true,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

if (IN_BROWSER || IN_NW || IN_EL || IN_WORKER || IN_NODE) {
    test.add([
        testThread,
        testThread_closeCancelAndForceClose,
        testThread_barkWatchdog,
        testThread_errorInThread,
        testThread_errorInWorker,
        testThread_closeSelf,
        testThread_postback,
        testThread_postbackWithToken,
        testThread_arrayBuffer,
        testThread_pool,
        testThread_messagePack,
        testThread_post_and_post,
        testThread_args,
    ]);
}

// --- test cases ------------------------------------------
function testThread(test, pass, miss) {

    // [1] Thread      | thread.post([0, "HELLO"])
    // [2] ThreadProxy | event.postback("HELLO WORLD") に加工して返す
    // [3] Thread      | "HELLO WORLD" を受け取る
    // [4] Thread      | thread.close()
    // [5] ThreadProxy | yes()
    // [6] Thread      | closeMessageHandler で exitCode が EXIT_OK な事を確認しテスト終了

    var valid = false;

    var thread = new Thread("../thread1.js", function postMessageHandler(args) {
            //
        }, function closeMessageHandler(exitCode) { // [6]
            switch (exitCode) {
            case EXIT_OK:
                if (valid) { test.done(pass()); }
                break;
            default:
                test.done(miss());
            }
        });

    thread.post([0, "HELLO"], null, function postbackMessageHandler(args, event) { // [3]
        //console.log(args[0]); // "HELLO WORLD"
        valid = args[0] === "HELLO WORLD";
        thread.close(); // [4]
    }); // [1]
}

function testThread_closeCancelAndForceClose(test, pass, miss) {

    // [1] Thread      | thread.close() リクエストを ThreadProxy に発行
    // [2] ThreadProxy | closeRequestHandler -> no() が呼ばれる。close を拒否 -> Thread の closeMessageHandler は呼ばれない
    // [3] Thread      | 1500ms 経過後に thread が active なことを確認し、thread.close(-1) で強制終了を実施
    //                 | -> closeMessageHandler(EXIT_FORCE)が呼ばれる
    // [4] Thread      | 2000ms 経過後に強制終了が成功している事を確認しテスト終了

    var valid = false;

    var thread = new Thread("../thread2.js", function postMessageHandler(args) {
            //
        }, function closeMessageHandler(exitCode) {
            switch (exitCode) {
            case EXIT_FORCE: valid = true; break;
            case EXIT_ERROR:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
                alert("exitCode: " + exitCode);
            }
        });

    thread.post([0, "HELLO"], null, function postbackMessageHandler(args) {
        console.log(args[0]); // "HELLO WORLD"
        thread.close(1000); // -> call closeRequestHandler  // [1]

        setTimeout(function() {
            if ( thread.active ) { // close canceled // [3]
                thread.close(-1); // force close!! -> handleClose(EXIT_FORCE)
            } else {
                test.done(miss());
            }
        }, 1500);
        setTimeout(function() {
            if ( valid && !thread.active ) { // close canceled // [4]
                test.done(pass());
            } else {
                test.done(miss());
            }
        }, 2000);
    });
}

function testThread_barkWatchdog(test, pass, miss) {

    // [1] Thread      | thread.close(1000) を要求
    // [2] ThreadProxy | yes() も no() も返さない
    // [3] Thread      | 1.0秒後にwatchdogが発動し自動でデストラクタが走る -> closeMessageHandler(EXIT_TIMEOUT) が呼ばれる
    // [4] Thread      | 1.5秒後に終了している事を確認
    var valid = false;

    var thread = new Thread("../thread3.js", function postMessageHandler(args) {
            //
        }, function closeMessageHandler(exitCode) { // [3]
            switch (exitCode) {
            case EXIT_TIMEOUT: valid = true;
            case EXIT_OK:
            case EXIT_ERROR:
            case EXIT_FORCE:
            }
        });

    thread.post([0, "HELLO"], null, function postbackMessageHandler(args) {
        console.log(args[0]); // "HELLO WORLD"
        thread.close(1000); // -> no response... [1]

        setTimeout(function() {
            if ( valid && !thread.active ) { // [4]
                test.done(pass());
            } else {
                test.done(miss());
            }
        }, 1500);
    });
}

function testThread_errorInThread(test, pass, miss) {

    // [1] ThreadProxy | thread4.js 内部で例外発生( throw new Error("lol") )
    // [2] Thread      | closeMessageHandler(EXIT_ERROR) が呼ばれる
    // [3] Thread      | 1秒後に終了している事を確認
    var valid = false;

    var thread = new Thread("../thread4.js", function postMessageHandler(args) {
        }, function closeMessageHandler(exitCode) { // [2]
            switch (exitCode) {
            case EXIT_ERROR: valid = true;
            case EXIT_OK:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
        });

    thread.post([0, "HELLO"], null, function postbackMessageHandler(args) {
        console.log(args[0]); // "HELLO WORLD"
        thread.close();

        setTimeout(function() {
            if (valid && !thread.active) { // [3]
                test.done(pass());
            } else {
                test.done(miss());
            }
        }, 1000);
    });
}

function testThread_errorInWorker(test, pass, miss) {

    // [1] ThreadProxy  | new ThreadProxy の外側(importScriptの次あたりで)で例外発生
    // [2] Thread       | handleClose(EXIT_ERROR) が呼ばれる
    // [3] Thread       | 2秒後に終了している事を確認
    var valid = false;

    setTimeout(function() {
        if (valid && !thread.active) { // [3]
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, 2000);

    var thread = new Thread("../thread5.js", function postMessageHandler(args) {
            //console.log(value); // "HELLO WORLD"
            //thread.close();

        }, function closeMessageHandler(exitCode) { // [2]
            switch (exitCode) {
            case EXIT_ERROR: valid = true;
            case EXIT_OK:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
        });

    thread.post([0, "HELLO"]);
}

function testThread_closeSelf(test, pass, miss) {

    // [1] ThreadProxy | ThreadProxy#close() で自身を閉じる
    // [2] Thread      | closeMessageHandler(EXIT_OK) が呼ばれる
    // [3] Thread      | 2秒後に終了している事を確認
    var valid = false;

    setTimeout(function() {
        if (valid && !thread.active) { // [3]
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, 2000);

    var thread = new Thread("../thread6.js", function postMessageHandler(args) {
            //console.log(value); // "HELLO WORLD"
            //thread.close();

        }, function closeMessageHandler(exitCode) { // [2]
            switch (exitCode) {
            case EXIT_OK: valid = true;
            case EXIT_ERROR:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
        });

    thread.post([0, "HELLO"], null, function postbackMessageHandler(args) {
    });
}

function testThread_postback(test, pass, miss) {

    // [1] Thread       | thread.post([123, "HELLO"])
    // [2] ThreadProxy  | event.postback([123, "HELLO WORLD"]) を返す
    // [3] Thread       | "HELLO WORLD" を受け取る
    // [4] Thread       | thread.close()
    // [5] ThreadProxy  | yes()
    // [6] Thread       | closeMessageHandler(EXIT_OK) が呼ばれる事を確認する

    var valid = false;

    var thread = new Thread("../thread7.js", function postMessageHandler(args) {
/*
            console.log(value); // "HELLO WORLD"
            valid = value === "HELLO WORLD"; // [3]
            thread.close(); // [4]
 */
            test.done(miss());
        }, function closeMessageHandler(exitCode) { // [6]
            switch (exitCode) {
            case EXIT_OK:
                if (valid) {
                    test.done(pass());
                    return;
                }
            case EXIT_ERROR:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
            test.done(miss());
        });

    thread.post([123, "HELLO"], null, function postbackMessageHandler(args, event) { // [1]
        console.log(args[1]); // "HELLO WORLD"
        if (args[0] === 123 && args[1] === "HELLO WORLD") { // [3]
            valid = true;
        }
        thread.close(); // [4]
    });
}

function testThread_postbackWithToken(test, pass, miss) {

    // [1] Thread       | thread.post( [ 1234, "HELLO" ] )
    // [2] ThreadProxy  | event.postback([1234, "HELLO WORLD"]) を返す
    // [3] Thread       | "HELLO WORLD" をポストバックで受け取る
    // [4] Thread       | thread.close()
    // [5] ThreadProxy  | yes()
    // [6] Thread       | closeMessageHandler(EXIT_OK) が呼ばれる事を確認する

    var valid = false;

    var thread = new Thread("../thread8.js", function postMessageHandler(args) {
/*
            console.log(value); // "HELLO WORLD"
            valid = value === "HELLO WORLD"; // [3]
            thread.close(); // [4]
 */
            test.done(miss());
        }, function closeMessageHandler(exitCode) { // [6]
            switch (exitCode) {
            case EXIT_OK:
                if (valid) {
                    test.done(pass());
                    return;
                }
            case EXIT_ERROR:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
            test.done(miss());
        });

    thread.post([1234, "HELLO"], null, function postbackMessageHandler(args, event) { // [1]
        console.log(args[1]); // "HELLO WORLD"
        valid = args[1] === "HELLO WORLD"; // [3]
        thread.close(); // [4]
    });
}

function testThread_arrayBuffer(test, pass, miss) {

    var valid = false;

    var thread = new Thread("../thread9.js", function postMessageHandler(args) {
            test.done(miss());
        }, function closeMessageHandler(exitCode) { // [6]
            switch (exitCode) {
            case EXIT_OK:
                if (valid) {
                    test.done(pass());
                    return;
                }
            case EXIT_ERROR:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
            test.done(miss());
        });

    var source = new Uint8Array([1,2,3]);

    thread.post([1, source.buffer], [source.buffer], function postbackMessageHandler(args, event) {
        var result = new Uint8Array(args[1]);

        if (result[0] === 2 &&
            result[1] === 4 &&
            result[2] === 6) {

            //if (source.buffer === null) {
                valid = true;
            //}
        }

        thread.close(); // [4]
    });
}



function testThread_pool(test, pass, miss) {

    var task = new Task("testThread_pool", 3, function(err) {
            if (err) {
                test.done(miss());
            } else {
                test.done(pass());
            }
        });

    var pool = new ThreadPool([
               new Thread("../thread10.js"),
               new Thread("../thread10.js"),
               new Thread("../thread10.js"),
            ]);

    pool.post([1, "A"], null, function(args) {
        if (args[1] === "A") {
            task.pass();
        } else {
            task.miss();
        }
    });
    pool.post([1, "B"], null, function(args) {
        if (args[1] === "B") {
            task.pass();
        } else {
            task.miss();
        }
    });
    pool.post([1, "C"], null, function(args) {
        if (args[1] === "C") {
            task.pass();
        } else {
            task.miss();
        }
    });
}


function testThread_messagePack(test, pass, miss) {
    var thread = new Thread("../thread11.js", null, function closeMessageHandler(exitCode) { // [6]
        //alert(exitCode);
    });

    var packed = WebModule.MessagePack.encode({
            msg: "HELLO",
            date1: new Date(),
            date2: null,
            data: new Uint8Array(10)
        });

    thread.post([1, packed.buffer], [packed.buffer], function(args) {
        var result = WebModule.MessagePack.decode(new Uint8Array(args[1]));
        console.log(result.msg);   // -> "HELLO WORLD";
        console.log(result.date1);
        console.log(result.date2);
        console.log(result.data);
        test.done(pass());
    });
}

function testThread_post_and_post(test, pass, miss) {
    // Thread#post([delayTime])
    // setTimeout(function() { ThreadProxy#post(]delayTime]) }, delayTime)

    var valid = false;

    var delayTime = 1000;
    var thread = new Thread("../thread12.js", function postMessageHandler(args) {
            if (delayTime === args[0]) {
                test.done(pass());
            } else {
                test.done(miss());
            }
            thread.close();
        }, function closeMessageHandler(exitCode) {
            //console.log(exitCode);
        });

    thread.post([delayTime]);
}

function testThread_args(test, pass, miss) {
    var thread = new Thread("../thread13.js", null, function(exitCode) {
            if (exitCode) {
                test.done(miss());
            } else {
                test.done(pass());
            }
        });

    thread.post();   // undefined
    thread.post(0);  // Number
    thread.post(""); // String
    thread.post([]); // Array

    setTimeout(function() {
        thread.close();
    }, 1000);
}

return test.run();

})(GLOBAL);

