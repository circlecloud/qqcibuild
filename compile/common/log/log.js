const log4js = require("log4js");
const path = require("path");
const moment = require("moment");
const fs = require("fs");
const util = require("util");
const { QQappLog } = require("../dirMap");
const now = moment();
const date = now.format("MMDD");
// const fulldate = localStorage.getItem("projectOpenTime");
const fulldate = "";
const LOG_FILE_SAVE_TIME = 30 * 24 * 60 * 60 * 1000; //一月
const configure = {
  appenders: {
    console: {
      type: "console" //这个console有时候在检查背景页的控制台，有时候在检查的控制台
    },
    info: {
      type: "file",
      filename: path.join(QQappLog, `info_${date}.log`)
    },
    error: {
      type: "file",
      filename: path.join(QQappLog, `error_${date}.log`)
    },
    mutation: {
      type: "file",
      filename: path.join(QQappLog, `mutation_${date}.log`)
    },
    http: {
      type: "file",
      filename: path.join(QQappLog, `http_${date}.log`)
    },
    jssdk: {
      type: "file",
      filename: path.join(QQappLog, `jssdk_${date}.log`)
    },
    reporter: {
      type: "file",
      filename: path.join(QQappLog, `reporter_${date}.log`)
    },
    applog: {
      type: "file",
      filename: path.join(QQappLog, `applog/${fulldate}.log`),
      layout: {
        type: "pattern",
        pattern: "%d %m%n"
      }
    }
  },
  categories: {
    info: {
      appenders: ["info"],
      level: "info"
    },
    error: {
      appenders: ["error"],
      level: "error"
    },
    mutation: {
      appenders: ["mutation"],
      level: "info"
    },
    http: {
      appenders: ["http"],
      level: "info"
    },
    jssdk: {
      appenders: ["jssdk"],
      level: "info"
    },
    reporter: {
      appenders: ["reporter"],
      level: "info"
    },
    applog: {
      appenders: ["applog"],
      level: "debug"
    },
    default: {
      appenders: ["console"],
      level: "debug"
    }
  }
};
if (
  !fulldate ||
  location.href.endsWith("index.html") ||
  location.href.endsWith("index.html#/")
) {
  delete configure.appenders.applog;
  delete configure.categories.applog;
}
log4js.configure(configure);

const infologger = log4js.getLogger("info");
const errorlogger = log4js.getLogger("error");
const mutationlogger = log4js.getLogger("mutation");
const httplogger = log4js.getLogger("http");
const jsddklogger = log4js.getLogger("jssdk");
const reporterlogger = log4js.getLogger("reporter");
const applogger = log4js.getLogger("applog");

function clearOldFiles(dir) {
  const files = fs.readdirSync(dir);
  const now = Date.now();
  const removeFiles = [];
  files.forEach(filename => {
    const filepath = path.join(dir, filename);
    const stat = fs.lstatSync(filepath);
    if (stat.isDirectory()) {
      clearOldFiles(path.join(dir, filename));
      return;
    }
    if (now - stat.mtimeMs > LOG_FILE_SAVE_TIME) {
      removeFiles.push(filename);
      console.log("remove file", filepath);
      try {
        fs.unlinkSync(filepath);
      } catch (e) {
        console.error(e);
      }
    }
  });
}
clearOldFiles(QQappLog);

//log和debug不会记录到本地文件
module.exports = {
  info() {
    console.info.call(console, ...arguments);
    infologger.info.call(infologger, ...arguments);
  },
  error() {
    console.error.call(console, ...arguments);
    errorlogger.error.call(errorlogger, ...arguments);
  },
  debug() {
    console.debug.call(console, ...arguments);
  },
  log() {
    console.log.call(console, ...arguments);
  },
  mutation() {
    mutationlogger.info.call(mutationlogger, ...arguments);
  },
  http() {
    httplogger.info.call(httplogger, ...arguments);
  },
  jssdk() {
    jsddklogger.info.call(jsddklogger, ...arguments);
  },
  reporter() {
    reporterlogger.info.call(reporterlogger, ...arguments);
  },
  applogger
};
