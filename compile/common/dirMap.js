// 改写微信的js\92320c1386e6db6a6f2556736a9bc280.js
const fs = require("fs"),
  path = require("path"),
  mkdir = require("mkdir-p");

const homePath = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  `AppData/Local/QQ小程序开发者工具/User Data/Default`
);
// homePath = path.join(nw.App.getDataPath(), '..');

function rmdir(filePath, isRmDir = true) {
  try {
    if (!fs.existsSync(filePath)) return;
    let f = fs.statSync(filePath);
    if (f.isDirectory()) {
      let f = fs.readdirSync(filePath);
      if (0 < f.length) {
        for (let b = 0, e = f.length; b < e; b++) {
          rmdir(path.join(filePath, f[b]), true);
        }
      }
      isRmDir && fs.rmdirSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error(e);
  }
}
let dirMap = {};
let dirList = `QQappStorage,QQappFileCache,QQappApplication,QQappVendor,QQappLog,ProxyCache,QQappEditor,QQappRemote,QQappRemote/data,QQappRemote/temp,QQappRemote/log,QQappRemote/vender,QQappFileSystem,QQappLocalData,QQappMiniCode,QQappCode,QQappdest,QQappTraceFiles,QQappPlugin,QQappCodeTmp`.split(
  ","
);
dirList.forEach(dirName => {
  dirMap[dirName] = path.join(homePath, dirName);
  if ("QQappdest,QQappTraceFiles".indexOf(dirName) > -1) {
    rmdir(dirMap[dirName], false);
  }
  mkdir.sync(dirMap[dirName]);
});

module.exports = dirMap;
