const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const events = require("events");
const glob = require("glob");
const chokidarConfig = require("./fileUtilConfig");

const { EventEmitter } = events;

/**
 * 文件管理类
 * 可以根据不同的需求，返回不同类型的文件路径，以及读取文件内容
 */
class FileUtil extends EventEmitter {
  constructor(dirPath, options) {
    super();

    options = options || {};

    this.dirPath = dirPath.replace(/\\/g, "/");
    this._getAllFile = this._getAllFile.bind(this);
    this.getFilesByExtName = this.getFilesByExtName.bind(this);
    this.resetCache();
    this.ready = this.ready.bind(this);
    this._isStopWatch = false;
    this._all = this._all.bind(this);

    if (!options.lazyInit) {
      this._getAllFile();
    }

    if (!options.noWatch) {
      this.startWatch();
    } else {
      this._ready = true;
    }
  }

  _getAllFile() {
    let dirPath = this.dirPath;

    try {
      const completeFileList = glob.sync("**", {
        nodir: false,
        ignore: chokidarConfig.ignored,
        nosort: true,
        strict: false,
        silent: true,
        cwd: dirPath,
        absolute: false,
        mark: true,
        dot: true
      });

      this.setAllFileListCache(completeFileList);
    } catch (e) {
      throw e;
    }
  }

  _all(eventType, fileName, details) {
    if (this._isStopWatch) {
      return;
    }

    if (fileName) {
      fileName = fileName.replace(/\\/g, "/");
    }

    let cache = this._cache;
    let fileData = cache.fileData || {};

    if (fileData[fileName]) {
      delete fileData[fileName];
    }

    let { fileList, completeFileList, fileInfo } = cache;

    if (eventType === "unlink") {
      let p = path.posix.relative(this.dirPath, fileName);
      let index = fileList.indexOf(p);
      if (index > -1) {
        fileList.splice(index, 1);
      }

      index = completeFileList.indexOf(p);
      if (index > -1) {
        completeFileList.splice(index, 1);
      }

      delete fileInfo[p];
    } else if (eventType === "unlinkDir") {
      let index = completeFileList.indexOf(
        path.posix.relative(this.dirPath, fileName) + "/"
      );
      if (index > -1) {
        completeFileList.splice(index, 1);
      }
    } else if (eventType === "add") {
      let p = path.posix.relative(this.dirPath, fileName);
      fileList.push(p);
      completeFileList.push(p);
      fileInfo[p] = details;
    } else if (eventType === "addDir") {
      completeFileList.push(path.posix.relative(this.dirPath, fileName) + "/");
    } else if (eventType === "change") {
      let p = path.posix.relative(this.dirPath, fileName);

      // 一些用户反馈在 部分 win10 1803下会自动编译，找用户定位后确认 是会触发文件改变但是 modifiy time并没有更新
      if (
        process.platform !== "darwin" &&
        fileInfo[p] &&
        fileInfo[p].mtimeMs === details.mtimeMs
      ) {
        return;
      }

      fileInfo[p] = details;
    }

    this.emit("all", eventType, fileName, details);
  }

  ready(callback) {
    if (this._ready) {
      callback();
    } else {
      this._watcher.once("ready", () => {
        callback();
      });
    }
  }

  startWatch() {
    this._watcher = chokidar.watch(this.dirPath, chokidarConfig);
    this._watcher.on("ready", () => {
      this._ready = true;
    });
    this._watcher.on("all", this._all);
    this._isStopWatch = false;
  }

  stopWatch() {
    this._isStopWatch = true;
    if (this._watcher) {
      this._watcher.unwatch();
      this._watcher.close();
    }

    this.resetCache();
    this.emit("close");
  }

  setAllFileListCache(completeFileList) {
    this._cache = {
      fileList: [],
      completeFileList: [],
      fileData: {},
      fileInfo: {}
    };

    let dirPath = this.dirPath;
    // Though windows uses either / or \ as its path separator, only / characters are used
    this._cache.completeFileList = completeFileList.map(file => {
      return file.replace(/\\/g, path.posix.sep).replace(/^\.\//, "");
    });

    const fileList = this._cache.completeFileList.filter(file => {
      let stat = fs.lstatSync(path.join(dirPath, file));
      let isFile = stat.isFile();
      if (isFile) this._cache.fileInfo[file] = stat;
      return isFile;
    });

    this._cache.fileList = fileList.map(file => {
      return file.replace(/\\/g, path.posix.sep);
    });
  }

  getAllFile(filter = "") {
    if (!filter) {
      return this._cache.fileList;
    }

    let res = [];
    this._cache.fileList.map(file => {
      if (file.indexOf(filter) == 0) {
        res.push(path.posix.relative(filter, file));
      }
    });
    return res;
  }

  getAllFileInfo(filter = "") {
    if (!filter) {
      return this._cache.fileInfo;
    }

    let res = {};

    for (let item in this._cache.fileInfo) {
      if (item.indexOf(filter) === 0) {
        res[path.posix.relative(filter, item)] = this._cache.fileInfo[item];
      }
    }

    return res;
  }

  getAllFileWithDir(filter = "") {
    if (!filter) {
      return this._cache.completeFileList;
    }

    let res = [];
    this._cache.completeFileList.map(file => {
      if (file.indexOf(filter) == 0) {
        res.push(path.posix.relative(filter, file));
      }
    });
    return res;
  }

  getFilesByExtName(extName = "", filter = "") {
    if (!extName) {
      return this.getAllFile(filter);
    }

    let fileList = this._cache.fileList;
    let res = [];
    fileList.forEach(file => {
      let extname = path.extname(file);
      if (extname === extName && file.indexOf(filter) == 0) {
        res.push(path.posix.relative(filter, file));
      }
    });

    return res;
  }

  getFile(filePath, encode = "utf8") {
    let isAbsolute = path.isAbsolute(filePath);
    if (isAbsolute) {
      return;
    }

    let cacheKey = encode === null ? "null" : encode;

    filePath = path.posix.join(this.dirPath, filePath.replace(/\\/g, "/"));
    if (this.dirPath.startsWith("//") && !filePath.startsWith("//")) {
      // windows style shared directory
      // leading double slash missed
      filePath = "/" + filePath;
    }

    let fileData = this._cache.fileData;

    if (!fileData[filePath]) {
      fileData[filePath] = {};
    }

    if (!fileData[filePath][[cacheKey]]) {
      fileData[filePath][[cacheKey]] = fs.readFileSync(filePath, encode);
    }

    return fileData[filePath][cacheKey];
  }

  exists(filePath) {
    if (!filePath) return false;

    filePath = path.posix.join(this.dirPath, filePath);
    if (this.dirPath.startsWith("//") && !filePath.startsWith("//")) {
      // windows style shared directory
      // leading double slash missed
      filePath = "/" + filePath;
    }
    return fs.existsSync(filePath);
  }

  writeFileSync(filePath, data, encode = "utf8") {
    // writeFileSync 之后， watcher 的事件通知异步比较慢，导致这时候去getFile 会有问题
    if (!filePath) {
      return;
    }
    filePath = path.posix.join(this.dirPath, filePath);
    if (this.dirPath.startsWith("//") && !filePath.startsWith("//")) {
      // windows style shared directory
      // leading double slash missed
      filePath = "/" + filePath;
    }

    // 清掉cache
    let cache = this._cache;
    let fileData = cache.fileData || {};
    if (fileData[filePath]) {
      delete fileData[filePath];
    }

    return fs.writeFileSync(filePath, data, encode);
  }

  resetCache() {
    this._cache = {
      fileList: [],
      completeFileList: [],
      fileData: {},
      fileInfo: {}
    };
  }
}
module.exports = FileUtil;
