/**
 * 传入项目路径，然后获取一个文件管理类的实例
 */

const path = require("path");
const projectFileUtil = require("./projectFileUtil");
const tools = require("./tools");
module.exports = async function(config) {
  // 如果配置文件中有指定项目根目录的话，将路径合并一下
  let path_root = config.miniprogramRoot
    ? path.posix.join(config.projectpath, config.miniprogramRoot)
    : config.projectpath;
  path_root = tools.normalizePath(path_root);
  if (
    (config.projectpath.startsWith("//") ||
      config.projectpath.startsWith("\\\\")) &&
    !path_root.startsWith("//")
  ) {
    path_root = "/" + path_root;
  }
  return await projectFileUtil(path_root);
};
