const path = require("path");
const child_process = require("child_process");
const tools = require("./files/tools");

let k;
let childProcess = null;
let promiseList = [];
const taskMap = {};
let timeout;

function handleMsg(a, msg) {
  if ("initsuccess" === msg.type) {
    k = !0;
    const list = promiseList;
    promiseList = [];
    for (const task of list) {
      // resolve
      task[0]();
    }
  } else if ("taskresult" === msg.type) {
    const task = taskMap[msg.id];
    if (task) {
      task.resolve && task.resolve(msg.result);
      delete taskMap[msg.id];
    } else {
      console.warn("unrecognized task result of msg", msg);
    }
  } else if ("taskerror" === msg.type) {
    console.warn("got task error", msg.id);
    const task = taskMap[msg.id];
    if (task) {
      task.reject && task.reject(msg.error);
      delete taskMap[msg.id];
    } else {
      console.warn("unrecognized task error of msg", msg);
    }
  }
}

function stopProcess() {
  if (childProcess) {
    try {
      childProcess.removeAllListeners();
      childProcess.kill("SIGTERM");
      console.log("enter stopProcess (childProcess.kill)");
    } catch (error) {
      console.warn("stopping child process error", error);
    }
    childProcess = null;
    k = void 0;
    clearTimeout(timeout);
    timeout = void 0;
    const list = promiseList;
    promiseList = [];
    for (const task of list) {
      // reject
      task[1]();
    }
  }
}

function initProcess() {
  let staticPath = tools.getStaticPath();
  let nodePath = path.join(staticPath, "node");
  if ("darwin" !== process.platform) {
    if ("linux" === process.platform) {
      nodePath += ".bin";
    } else {
      nodePath += ".exe";
    }
  }

  childProcess = child_process.fork(
    path.join(staticPath, "compile/child.js"),
    ["--expose-gc"],
    {
      execPath: nodePath,
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      env: {
        START_SERVER: "yes"
      },
      silent: true
    }
  );

  childProcess.stdout.setEncoding("utf8");
  childProcess.stdout.on("data", data => {
    console.log("stdout: " + data);
  });
  childProcess.stderr.on("data", error => {
    console.log("stderr: " + error);
  });
  const d = childProcess;
  const eventCallback = (...param) => {
    if (childProcess === d) {
      try {
        stopProcess();
      } catch (error) {
        console.error("stop child process error", error);
      }
    }
  };
  childProcess.on("disconnect", eventCallback);
  childProcess.on("close", eventCallback);
  childProcess.on("exit", (code, signal) => {
    eventCallback(code);
  });
  childProcess.on("error", (...error) => {
    eventCallback(...error);
    console.warn("child process encountered an error", ...error);
  });
  childProcess.on("message", msg => {
    if ("object" == typeof msg) {
      handleMsg(childProcess, msg);
    } else {
      console.warn("unrecognized msg from cp", msg);
    }
  });
}
async function startProcess() {
  if (childProcess && !childProcess.killed) {
    clearTimeout(timeout);
    timeout = void 0;
    return Promise.resolve();
  } else {
    return new Promise((resolve, reject) => {
      if (!childProcess || childProcess.killed)
        try {
          initProcess();
        } catch (error) {
          reject(error);
        }
      promiseList.push([resolve, reject]);
    });
  }
}

function generateId(len = 12) {
  const token =
    "=-_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" + Date.now();
  let id = "";
  for (let i = 0; i < len; i++) {
    const num = Math.floor(Math.random() * token.length);
    id += token.substring(num, num + 1);
  }
  return id;
}

function sendTask(config, reject) {
  if (!childProcess || childProcess.killed) return false;
  taskMap[config.id] = config;
  try {
    childProcess.send(config, error => {
      if (error) {
        delete taskMap[config.id];
        if (reject) {
          reject(error);
        }
      }
    });
  } catch (error) {
    console.error("error1", error);
    return false;
  }
  return true;
}

module.exports = {
  start: startProcess,
  stop: function(immediateFlag = false) {
    if (!childProcess || childProcess.killed) {
      return void 0;
    } else {
      if (immediateFlag) {
        return void stopProcess();
      } else {
        if (void 0 == timeout) {
          timeout = setTimeout(() => {
            stopProcess();
          }, 5 * 1000);
        }
        return void 0;
      }
    }
  },
  runTask: async function(config) {
    return new Promise(async (resolve, reject) => {
      if (!config) {
        console.warn("invalid task param", config);
        return reject();
      }
      await startProcess();
      const id = config.id || `${generateId()}`;
      const param = {
        type: "task",
        id: id,
        path: config.path,
        param: Object.assign({}, config.param)
      };
      const rst = sendTask(param, reject);
      if (rst) {
        param.resolve = resolve;
        param.reject = reject;
        taskMap[param.id] = param;
        return;
      } else {
        return reject("send task failed");
      }
    });
  },
  getCh() {
    return childProcess;
  },
  getTasksMap() {
    return taskMap;
  }
};
