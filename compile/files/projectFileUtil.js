/**
 * 文件管理类的封装，提供便利方法
 */

const path = require("path");
const fileWatcher = require("./getFileUtil.js");
class ProjectFileUtil {
  constructor(watcher, srcPath) {
    this.projectPath = watcher.dirPath;
    this.srcPath = srcPath.replace(/\\/g, "/") || this.projectPath;
    this.relativePath = `${path.posix.relative(
      this.projectPath,
      this.srcPath
    )}`;
    this.relativePath && (this.relativePath += "/");
    this.watcher = watcher;
    this._handles = [];
  }
  getAllFile() {
    return this.watcher.getAllFile(this.relativePath);
  }
  getFilesByExtName(extName) {
    return this.watcher.getFilesByExtName(extName, this.relativePath);
  }
  getAllWXMLFiles() {
    let wxmlFiles = this.watcher.getFilesByExtName(".wxml", this.relativePath);
    let qmlFiles = this.watcher.getFilesByExtName(".qml", this.relativePath);
    return [].concat(wxmlFiles).concat(qmlFiles);
  }
  getAllWXSFiles() {
    let wxsFiles = this.watcher.getFilesByExtName(".wxs", this.relativePath);
    let qsFiles = this.watcher.getFilesByExtName(".qs", this.relativePath);

    return [].concat(wxsFiles).concat(qsFiles);
  }
  getAllJSFiles() {
    return this.watcher.getFilesByExtName(".js", this.relativePath);
  }
  getAllWXSSFiles() {
    let wxssFiles = this.watcher.getFilesByExtName(".wxss", this.relativePath);
    let qssFiles = this.watcher.getFilesByExtName(".qss", this.relativePath);
    return [].concat(wxssFiles).concat(qssFiles);
  }
  getAllJSONFiles() {
    return this.watcher.getFilesByExtName(".json", this.relativePath);
  }
  getAllFileInfo() {
    return this.watcher.getAllFileInfo(this.relativePath);
  }
  exists(b) {
    return this.watcher.exists(path.posix.join(this.relativePath, b));
  }
  getFile(b, c = "utf8") {
    return this.watcher.getFile(path.posix.join(this.relativePath, b), c);
  }
  watch(a) {
    this._handles.push(a), this._lazyWatch();
  }
  unWatch(a) {
    this._handles = this._handles.filter(b => {
      return b != a;
    });
  }
  _lazyWatch() {
    this._lazyWatched ||
      (this.watcher.on("all", (b, c, d) => {
        c.indexOf(this.srcPath) == 0 &&
          this._handles.forEach(e => {
            e(b, path.posix.relative(this.srcPath, c), d);
          });
      }),
      (this._lazyWatched = !0));
  }
}

async function getProjectFileUtils(projectPath) {
  let watcher = await fileWatcher(projectPath);
  let projectFileUtil = new ProjectFileUtil(watcher, projectPath);
  return projectFileUtil;
}

module.exports = getProjectFileUtils;
