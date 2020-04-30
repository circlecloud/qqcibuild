const mkdir = require('mkdir-p');
const fs = require('fs');
const path = require('path');

const fileUtil = require('../common/fileUtil');
const { whiteFileExtName, gameWhiteFileExtName } = require('../common/projectConfig');

const miniExcludeExt = { ".js": true, ".wxss": true, ".qss": true }
const checkMiniExt = { ".json": true, ".wxml": true, ".wxs": true, ".qs": true, ".qml": true }
const checkGameExt = { ".json": true }
const gameExcludeExt = { ".js": true }

const writeFile = (config, fileObj, recordTxt) => {
  const { srcFilePath, fileBuffer, destFilePath } = fileObj,
    extname = path.extname(srcFilePath);
  recordTxt && recordTxt(`正在编译 ${path.basename(srcFilePath)}`);
  let checkExt = config.compileType == 'game' ? checkGameExt : checkMiniExt;
  // json，wxml及wxs文件需要校验是否UTF8编码
  if (checkExt[extname]) {
    const buf = bufToUTF8(fileBuffer);
    if (buf === undefined) {
      let err = new Error(`${srcFilePath} not utf8`);
      err.code = -1
      throw err;
    }
  }
  const dir = path.dirname(destFilePath);
  mkdir.sync(dir);
  fs.writeFileSync(destFilePath, fileBuffer);
  // console.log(`compileOther file [${path.basename(srcFilePath)}] done.`);
};

module.exports = async (config, distConfig = {}, recordTxt) => {
  const { compileType } = config;
  const { distPath } = distConfig;

  const util = new fileUtil(config.projectpath);

  // 取出所有项目目录下所有文件路径，并将指定后缀名的文件复制到目的文件夹对应路径
  let files = util.getAllFile();
  if (compileType == 'plugin') {
    files = files.filter(item => {
      if (item.indexOf('doc/') == 0) {
        return false
      }
      return true
    })
  }

  const programRoot = '';
  let excludeExt = config.compileType == 'game' ? gameExcludeExt : miniExcludeExt;
  let whiteExt = config.compileType == 'game' ? gameWhiteFileExtName : whiteFileExtName;

  files.forEach(item => {
    const extname = path.extname(item);

    if (!excludeExt[extname] && whiteExt[extname]) {
      const file = util.getFile(item, null);
      writeFile(config, {
        fileBuffer: file,
        srcFilePath: path.join(programRoot, item),
        destFilePath: path.join(distPath, programRoot, item)
      }, recordTxt);
    }
  });
};
function bufToUTF8(buf) {
  let bufStr = buf.toString();
  return Buffer.compare(Buffer.from(bufStr, 'utf8'), buf) === 0 ? bufStr : undefined;
}
