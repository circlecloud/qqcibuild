// coyp from https://github.com/Microsoft/vscode/blob/823b3db494d6dc5aadef73b798d9f806053c28fb/src/vs/workbench/services/files/node/watcher/unix/chokidarWatcherService.ts
// 和 vs code 保持一致的监听配置
module.exports = {
  // ignored: [ /node_modules/],  // 会导致 .../node_modules/projectpath 没有更监听
  ignored: [
    "node_modules/**/*",
    "**/node_modules/**",
    "**/.git/**",
    ".git/**/*",
    "**/.svn/**",
    ".svn/**/*",
    ".DS_Store",
    "**/.DS_Store",
    "**/.vscode/**",
    ".vscode/**",
    "**/.idea/**",
    ".idea/**"
  ], // 只有 .../projectpath 下的 node_modules 内的文件没有监听
  ignoreInitial: true,
  ignorePermissionErrors: true,
  followSymlinks: true, // this is the default of chokidar and supports file events through symlinks
  interval: 1000, // while not used in normal cases, if any error causes chokidar to fallback to polling, increase its intervals
  binaryInterval: 1000,
  disableGlobbing: true // fix https://github.com/Microsoft/vscode/issues/4586
};
