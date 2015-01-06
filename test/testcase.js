var ModuleTestThread = (function(global) {

var _isNodeOrNodeWebKit = !!global.global;
var _runOnNodeWebKit =  _isNodeOrNodeWebKit && /native/.test(setTimeout);
var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var EXIT_OK      = Thread.OK;
var EXIT_ERROR   = Thread.ERROR;
var EXIT_FORCE   = Thread.FORCE;
var EXIT_TIMEOUT = Thread.TIMEOUT;

return new Test(["Thread", "ThreadPool"], {
        disable:    false,
        browser:    true,
        worker:     false,
        node:       false,
        nw:         false,
        button:     true,
        both:       true, // test the primary module and secondary module
    }).add([
        testThread,
        testThreadCloseCancelAndForceClose,
        testThreadBarkWatchdog,
        testThreadErrorInThread,
        testThreadErrorInWorker,
        testThreadCloseSelf,
        testThreadPostback,
        testThreadPostbackWithToken,
        testThreadArrayBuffer,
        testThreadPool,
    ]).run().clone();

function testThread(test, pass, miss) {

    // [1] MainThread   | thread.post(0, "HELLO")
    // [2] WorkerThread | thread.post(0, event.data + " WORLD") に加工して返す
    // [3] MainThread   | "HELLO WORLD" を受け取る
    // [4] MainThread   | thread.close()
    // [5] WorkerThread | ready()
    // [6] MainThread   | handleClose(EXIT_OK) が呼ばれる事を確認する

    var valid = false;

    var thread = new Thread("thread1.js", function(key, value, postback, event) {
            console.log(value); // "HELLO WORLD"
            valid = value === "HELLO WORLD"; // [3]
            thread.close(); // [4]
        }, function(exitCode, errorMessage) { // [6]
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

    thread.post(0, "HELLO"); // [1]
}

function testThreadCloseCancelAndForceClose(test, pass, miss) {

    // [1] MainThread   | thread.close() を要求
    // [2] WorkerThread | cancel() を実行し、closeを拒否 -> handleClose は呼ばれない
    // [3] MainThread   | 1.5秒経過しても threadが生存していることを確認し、thread.close(-1) で強制終了
    //                  | -> handleClose(EXIT_FORCE)が呼ばれる
    // [4] MainThread   | 2.0秒後に強制終了が成功している事を確認

    var valid = false;

    var thread = new Thread("thread2.js", function(key, value, postback, event) {
            console.log(value); // "HELLO WORLD"
            thread.close(1000); // -> cancel // [1]

            setTimeout(function() {
                if ( thread.isAlive() ) { // close canceled // [3]
                    thread.close(-1); // force close!! -> handleClose(EXIT_FORCE)
                } else {
                    test.done(miss());
                }
            }, 1500);
            setTimeout(function() {
                if ( valid && !thread.isAlive() ) { // close canceled // [4]
                    test.done(pass());
                } else {
                    test.done(miss());
                }
            }, 2000);
        }, function(exitCode, errorMessage) {
            switch (exitCode) {
            case EXIT_FORCE: valid = true;
            case EXIT_OK:
            case EXIT_ERROR:
            case EXIT_TIMEOUT:
            }
        });

    thread.post(0, "HELLO");
}

function testThreadBarkWatchdog(test, pass, miss) {

    // [1] MainThread   | thread.close(1000) を要求
    // [2] WorkerThread | ready() も cancel() も返さない
    // [3] MainThread   | 1.0秒後にwatchdogが発動し自動でデストラクタが走る -> handleClose(EXIT_TIMEOUT) が呼ばれる
    // [4] MainThread   | 1.5秒後に終了している事を確認
    // [5] MainThread   | watchdog が発動した場合は handleClose(reason) は呼ばれない
    var valid = false;

    var thread = new Thread("thread3.js", function(key, value, postback, event) {
            console.log(value); // "HELLO WORLD"
            thread.close(1000); // -> no response... [1]

            setTimeout(function() {
                if ( valid && !thread.isAlive() ) { // [4]
                    test.done(pass());
                } else {
                    test.done(miss());
                }
            }, 1500);
        }, function(exitCode, errorMessage) { // [3]
            switch (exitCode) {
            case EXIT_TIMEOUT: valid = true;
            case EXIT_OK:
            case EXIT_ERROR:
            case EXIT_FORCE:
            }
        });

    thread.post(0, "HELLO");
}

function testThreadErrorInThread(test, pass, miss) {

    // [1] WorkerThread | WorkerThread 内部で例外発生
    // [2] MainThread   | handleClose(EXIT_ERROR) が呼ばれる
    // [3] MainThread   | 1秒後に終了している事を確認
    var valid = false;

    var thread = new Thread("thread4.js", function(key, value, postback, event) {
            console.log(value); // "HELLO WORLD"
            thread.close();

            setTimeout(function() {
                if (valid && !thread.isAlive()) { // [3]
                    test.done(pass());
                } else {
                    test.done(miss());
                }
            }, 1000);

        }, function(exitCode, errorMessage) { // [2]
            switch (exitCode) {
            case EXIT_ERROR: valid = true;
            case EXIT_OK:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
        });

    thread.post(0, "HELLO");
}

function testThreadErrorInWorker(test, pass, miss) {

    // [1] WorkerThread | WorkerThread の外側(importScriptの次あたりで)で例外発生
    // [2] MainThread   | handleClose(EXIT_ERROR) が呼ばれる
    // [3] MainThread   | 2秒後に終了している事を確認
    var valid = false;

    setTimeout(function() {
        if (valid && !thread.isAlive()) { // [3]
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, 2000);

    var thread = new Thread("thread5.js", function(key, value, postback, event) {
            //console.log(value); // "HELLO WORLD"
            //thread.close();

        }, function(exitCode, errorMessage) { // [2]
            switch (exitCode) {
            case EXIT_ERROR: valid = true;
            case EXIT_OK:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
        });

    thread.post(0, "HELLO");
}

function testThreadCloseSelf(test, pass, miss) {

    // [1] WorkerThread | thread.close() で自分自身を閉じる
    // [2] MainThread   | handleClose(EXIT_OK) が呼ばれる
    // [3] MainThread   | 2秒後に終了している事を確認
    var valid = false;

    setTimeout(function() {
        if (valid && !thread.isAlive()) { // [3]
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, 2000);

    var thread = new Thread("thread6.js", function(key, value, postback, event) {
            //console.log(value); // "HELLO WORLD"
            //thread.close();

        }, function(exitCode, errorMessage) { // [2]
            switch (exitCode) {
            case EXIT_OK: valid = true;
            case EXIT_ERROR:
            case EXIT_FORCE:
            case EXIT_TIMEOUT:
            }
        });

    thread.post(0, "HELLO");
}

function testThreadPostback(test, pass, miss) {

    // [1] MainThread   | thread.post(123, "HELLO", postback)
    // [2] WorkerThread | thread.post(123, event.data + " WORLD", token) に加工して返す
    // [3] MainThread   | "HELLO WORLD" をポストバックで受け取る
    // [4] MainThread   | thread.close()
    // [5] WorkerThread | ready()
    // [6] MainThread   | handleClose(EXIT_OK) が呼ばれる事を確認する

    var valid = false;

    var thread = new Thread("thread7.js", function(key, value, postback, event) {
/*
            console.log(value); // "HELLO WORLD"
            valid = value === "HELLO WORLD"; // [3]
            thread.close(); // [4]
 */
            test.done(miss());
        }, function(exitCode, errorMessage) { // [6]
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

    var masterKey = 123; // random value

    thread.post(masterKey, "HELLO", function(copiedKey, value, postback, event) { // [1]
        console.log(value); // "HELLO WORLD"
        if (masterKey === copiedKey && value === "HELLO WORLD") { // [3]
            valid = true;
        }
        thread.close(); // [4]
    });
}

function testThreadPostbackWithToken(test, pass, miss) {

    // [1] MainThread   | thread.post("", "HELLO", null, postback, 1234)
    // [2] WorkerThread | thread.post(event.data + " WORLD", null, token) に加工して返す
    // [3] MainThread   | "HELLO WORLD" をポストバックで受け取る
    // [4] MainThread   | thread.close()
    // [5] WorkerThread | ready()
    // [6] MainThread   | handleClose(EXIT_OK) が呼ばれる事を確認する

    var valid = false;
    var key = 1234;

    var thread = new Thread("thread8.js", function(key, value, postback, event) {
/*
            console.log(value); // "HELLO WORLD"
            valid = value === "HELLO WORLD"; // [3]
            thread.close(); // [4]
 */
            test.done(miss());
        }, function(exitCode, errorMessage) { // [6]
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

    thread.post(key, "HELLO", function(key, value, postback, event) { // [1]
        console.log(value); // "HELLO WORLD"
        valid = value === "HELLO WORLD"; // [3]
        thread.close(); // [4]
    });
}

function testThreadArrayBuffer(test, pass, miss) {

    var valid = false;

    var thread = new Thread("thread9.js", function(key, value, postback, event) {
            test.done(miss());
        }, function(exitCode, errorMessage) { // [6]
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

    thread.post(1, source.buffer, function(key, value, postback, event) {
        var result = new Uint8Array(value);

        if (result[0] === 2 &&
            result[1] === 4 &&
            result[2] === 6) {

            //if (source.buffer === null) {
                valid = true;
            //}
        }

        thread.close(); // [4]
    }, [source.buffer]);
}



function testThreadPool(test, pass, miss) {

    var task = new TestTask(3, function(err) {
            if (err) {
                test.done(miss());
            } else {
                test.done(pass());
            }
        });

    var pool = new ThreadPool([
                new Thread("thread10.js"),
                new Thread("thread10.js"),
                new Thread("thread10.js"),
            ]);

    var source = new Uint8Array([1,2,3]);

    pool.post(1, "A", function(key, value, postback, event) {
        if (value === "A") {
            task.pass();
        } else {
            task.miss();
        }
    });
    pool.post(1, "B", function(key, value, postback, event) {
        if (value === "B") {
            task.pass();
        } else {
            task.miss();
        }
    });
    pool.post(1, "C", function(key, value, postback, event) {
        if (value === "C") {
            task.pass();
        } else {
            task.miss();
        }
    });
}

})((this || 0).self || global);

