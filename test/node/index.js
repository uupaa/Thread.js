// Thread test

require("../../lib/WebModule.js");

WebModule.VERIFY  = true;
WebModule.VERBOSE = true;
WebModule.PUBLISH = true;

require("../../node_modules/uupaa.task.js/lib/Task.js");
require("../../node_modules/uupaa.task.js/lib/TaskMap.js");
require("../../node_modules/uupaa.messagepack.js/node_modules/uupaa.utf8.js/lib/UTF8.js");
require("../../node_modules/uupaa.messagepack.js/lib/MessagePack.js");
require("../wmtools.js");
require("../../lib/Thread.js");
require("../../release/Thread.n.min.js");
require("../testcase.js");

