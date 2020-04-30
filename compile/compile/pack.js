const glob = require("glob")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

async function Pack(srcPath, distPath, option = {}) {
  var header = [Buffer.allocUnsafe(1), Buffer.allocUnsafe(4), Buffer.allocUnsafe(4), Buffer.allocUnsafe(4), Buffer.allocUnsafe(1)]
  header[0].writeUIntLE(190, 0, 1)
  header[1].writeInt32BE(1)
  header[4].writeUIntLE(237, 0, 1)

  let fileCount = 0,
    fileHeaderBuf = [],
    fileHeaderArr = [],
    fileNameArr = [], // 文件相对路径
    fileContentArr = [], // 文件内容
    fileContentBuf = []
  return new Promise((resolve, reject) => {
    let options = Object.assign({
          nodir: !0
        },
        option
      ),
      fileMd5Info = {},
      totalSize = 0
    glob(`${srcPath}/**`, options, (err, files) => {
      if (!err) {
        files.forEach(filePath => {
          let fileContent = fs.readFileSync(filePath),
            relPath = path.relative(srcPath, filePath)
          if (option.needMd5) {
            let hash = crypto.createHash("md5")
            hash.update(fileContent)
            let md5Str = hash.digest("hex")
            fileMd5Info[relPath] = md5Str
            if (option.ignoreFileMd5 && option.ignoreFileMd5[relPath] == md5Str) return
          }
          let relPathBuf = Buffer.from(`/${relPath.replace(/\\/g, "/")}`)
          fileCount++
          fileNameArr.push(relPathBuf)
          fileContentArr.push(fileContent)
          if (!/\.js\.map$/.test(filePath)) {
            totalSize += fileContent.length
            totalSize += relPathBuf.length
            totalSize += 12
          }
        })
        let offset = 18 + 12 * fileCount + Buffer.concat(fileNameArr).length
        fileHeaderArr = fileNameArr.map((name, index) => {
          let nameLenBuf = Buffer.allocUnsafe(4)
          nameLenBuf.writeInt32BE(name.length)
          let fileContentOffsetBuf = Buffer.allocUnsafe(4),
            fileLen = fileContentArr[index].length,
            fileContentOffset = offset
          fileContentOffsetBuf.writeInt32BE(fileContentOffset)
          offset += fileLen
          let fileLenBuf = Buffer.allocUnsafe(4)
          fileLenBuf.writeInt32BE(fileLen)
          return Buffer.concat([nameLenBuf, name, fileContentOffsetBuf, fileLenBuf])
        })

        let fileCountBuf = Buffer.allocUnsafe(4)
        fileCountBuf.writeInt32BE(fileCount)
        fileHeaderArr.unshift(fileCountBuf)
        fileHeaderBuf = Buffer.concat(fileHeaderArr)
        fileContentBuf = Buffer.concat(fileContentArr)
        header[2].writeInt32BE(fileHeaderBuf.length)
        header[3].writeInt32BE(fileContentBuf.length)
        header = Buffer.concat(header)
        let packBuf = Buffer.concat([header, fileHeaderBuf, fileContentBuf])
        // fs.writeFileSync(distPath, packBuf)
        // logger.info(`pack.js create ${distPath} success!`)
        totalSize += 18
        resolve({
          destPath: distPath,
          data: packBuf,
          totalSize: totalSize,
          fileMd5Info: fileMd5Info
        })
      } else {
        reject(err)
      }
    })
  })
}

module.exports = async function(config) {
  const { srcPath, distPath = `${path.resolve(srcPath, "..", Date.now() + ".wxapkg")}` } = config

  try {
    return await Pack(srcPath, distPath);
  } catch (err) {
    err.ret = -1
    throw err
  }
}
