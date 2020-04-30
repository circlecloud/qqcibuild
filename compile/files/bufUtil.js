const a = require("./getProjectFileUtil");
const b = require("path");
const { whiteFileExtName } = require("./fileConfig");
function bufToUTF8(buf) {
  let bufStr = buf.toString();
  return Buffer.compare(Buffer.from(bufStr, "utf8"), buf) === 0
    ? bufStr
    : undefined;
}
/**
 * 统计项目文件的总大小（只统计指定后缀名的文件）
 */
async function constcalculateTotalSize(d) {
  let e = await a(d),
    f = e.getAllFileInfo(),
    g = 0;
  for (let a in f) {
    let e = b.extname(a);
    if (whiteFileExtName[e]) {
      if (
        (!d.attr ||
          !d.attr.platform ||
          !d.attr.extInfo ||
          !d.attr.extInfo.appid) &&
        a == "ext.json"
      )
        continue;
      let b = f[a];
      g += b.size;
    }
  }
  return g;
}
module.exports = {
  bufToUTF8,
  constcalculateTotalSize
};
