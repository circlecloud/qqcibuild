const glob = require("glob");
const fastglob = require("fast-glob");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mkdir = require("mkdir-p");

async function Pack(srcPath, distPath, option = {}) {
  var header = [
    Buffer.allocUnsafe(1),
    Buffer.allocUnsafe(4),
    Buffer.allocUnsafe(4),
    Buffer.allocUnsafe(4),
    Buffer.allocUnsafe(1)
  ];
  header[0].writeUIntLE(190, 0, 1);
  header[1].writeInt32BE(1);
  header[4].writeUIntLE(237, 0, 1);

  let fileCount = 0;
  let fileHeaderBuf = [];
  let fileHeaderArr = [];
  let fileNameArr = []; // 文件相对路径
  let fileContentArr = []; // 文件内容
  let fileContentBuf = [];

  return new Promise((resolve, reject) => {
    let options = Object.assign(
      {
        onlyFiles: true
      },
      option
    );

    let fileMd5Info = {};
    let totalSize = 0;

    try {
      fastglob(`${srcPath}/**`, options).then(files => {
        files.forEach(filePath => {
          let fileContent = fs.readFileSync(filePath);
          let relPath = path.relative(srcPath, filePath);
          if (option.needMd5) {
            let hash = crypto.createHash("md5");
            hash.update(fileContent);
            let md5Str = hash.digest("hex");
            fileMd5Info[relPath] = md5Str;
            if (option.ignoreFileMd5 && option.ignoreFileMd5[relPath] == md5Str)
              return;
          }
          let relPathBuf = Buffer.from(`/${relPath.replace(/\\/g, "/")}`);
          fileCount++;
          fileNameArr.push(relPathBuf);
          fileContentArr.push(fileContent);
          if (!/\.js\.map$/.test(filePath)) {
            totalSize += fileContent.length;
            totalSize += relPathBuf.length;
            totalSize += 12;
          }
        });
        let offset = 18 + 12 * fileCount + Buffer.concat(fileNameArr).length;
        fileHeaderArr = fileNameArr.map((name, index) => {
          let nameLenBuf = Buffer.allocUnsafe(4);
          nameLenBuf.writeInt32BE(name.length);
          let fileContentOffsetBuf = Buffer.allocUnsafe(4),
            fileLen = fileContentArr[index].length,
            fileContentOffset = offset;
          fileContentOffsetBuf.writeInt32BE(fileContentOffset);
          offset += fileLen;
          let fileLenBuf = Buffer.allocUnsafe(4);
          fileLenBuf.writeInt32BE(fileLen);
          return Buffer.concat([
            nameLenBuf,
            name,
            fileContentOffsetBuf,
            fileLenBuf
          ]);
        });

        let fileCountBuf = Buffer.allocUnsafe(4);
        fileCountBuf.writeInt32BE(fileCount);
        fileHeaderArr.unshift(fileCountBuf);
        fileHeaderBuf = Buffer.concat(fileHeaderArr);
        fileContentBuf = Buffer.concat(fileContentArr);
        header[2].writeInt32BE(fileHeaderBuf.length);
        header[3].writeInt32BE(fileContentBuf.length);
        header = Buffer.concat(header);
        let packBuf = Buffer.concat([header, fileHeaderBuf, fileContentBuf]);
        mkdir.sync(path.dirname(distPath));
        try {
          fs.writeFileSync(distPath, packBuf);
          console.info(`pack.js create ${distPath} success!`);
          totalSize += 18;
          resolve({
            destPath: distPath,
            data: packBuf,
            totalSize: totalSize,
            fileMd5Info: fileMd5Info
          });
        } catch (err) {
          console.error(err);
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = function(srcPath) {
  let startTime = +new Date();
  console.group("pack start");
  let tmp = srcPath.split(path.sep);
  tmp.pop();
  tmp.push("pack_pkg");
  const destPath = tmp.join(path.sep);
  const packFilePath = path.join(destPath, `${Date.now()}.wx`);
  return new Promise((resolve, reject) => {
    Pack(srcPath, packFilePath)
      .then(data => {
        console.info("pack end,cost:", +new Date() - startTime);
        console.info(`pack distPath: ${data.destPath}`);
        fs.unlink(packFilePath, () => {});
        resolve(data);
      })
      .catch(err => {
        console.error("pack fail: " + err.message);
        reject(err);
      })
      .then(() => {
        console.groupEnd();
      });
  });
};
