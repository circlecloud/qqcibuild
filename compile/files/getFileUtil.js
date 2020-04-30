const FileUtils = require("./fileUtil");
const path = require("path");
var cache = {};
function normalizePath(a) {
  const b = path.posix.normalize(a.replace(/\\/g, "/"));
  return (a.startsWith("//") || a.startsWith("\\\\")) && !b.startsWith("//")
    ? "/" + b
    : b;
}
function getFileUtil(dirPath, options) {
  dirPath = normalizePath(dirPath);

  return new Promise((resolve, reject) => {
    if (!cache[dirPath]) {
      try {
        cache[dirPath] = new FileUtils(dirPath, options);
        cache[dirPath].on("close", () => {
          delete cache[dirPath];
        });
        cache[dirPath].ready(() => {
          resolve(cache[dirPath]);
        });
      } catch (e) {
        reject(e);
      }
    } else {
      resolve(cache[dirPath]);
    }
  });
}
/**
 * 实例化一个文件管理类
 * @param {项目路径} dirPath
 */
module.exports = getFileUtil;
