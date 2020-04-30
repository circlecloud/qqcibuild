/**
 * 处理除wxml,wxss,qml,qss,qs,js,wxs之外的文件，平移到目的路径中即可
 * @param {} projectInfo
 */

const path = require("path"),
  fs = require("fs"),
  mkdir = require("mkdir-p")

const excludeExt = { ".js": true, ".wxss": true, ".wxml": true, ".wxs": true, ".qss": true, ".qml": true, ".qs": true, ".json": true }
const whiteFileExtName = {
  ".wxml": true,
  ".wxss": true,
  ".wxs": true,
  ".qss": true,
  ".qml": true,
  ".qs": true,
  ".png": true,
  ".jpg": true,
  ".jpeg": true,
  ".gif": true,
  ".svg": true,
  ".js": true,
  ".json": true,
  ".cer": true,
  ".mp3": true,
  ".aac": true,
  ".m4a": true,
  ".mp4": true,
  ".wav": true,
  ".ogg": true,
  ".silk": true
}

function getFiles(projectInfo) {
  let files = projectInfo.fileUtil.getAllFile()

  const { appConfig, subPackageConfig } = projectInfo

  // 如果是分包模式
  if (appConfig.subPackages) {
    // 如果是子包，用子包文件
    if (subPackageConfig) {
      files = files.filter(file => {
        return file.indexOf(subPackageConfig.root) === 0
      })
    } else {
      // 否则如果是主包，直接用主包中的文件

      // 过滤掉分包中文件 找出主包中的文件
      let _files = files.filter(file => {
        let flag = true
        appConfig.subPackages.forEach(config => {
          if (file.indexOf(config.root) === 0) {
            flag = false
          }
        });
        return flag
      })

      files = _files
    }
  }

  return {
    files
  }
}

function writeFile(fileObj) {
  const { srcFilePath, fileBuffer, destFilePath } = fileObj,
  extname = path.extname(srcFilePath)

  // if (checkExt[extname]) {
  //  const buf = bufToUTF8(fileBuffer)
  //  if (buf === undefined) {
  //    let err = new Error(locales.config.FILE_NOT_UTF8.format(srcFilePath))
  //    throw ((err.code = FILE_NOT_UTF8), err)
  //  }
  // }
  const dir = path.dirname(destFilePath)
  mkdir.sync(dir)
  fs.writeFileSync(destFilePath, fileBuffer)
}

module.exports = async function(projectInfo) {
  //json文件如何处理还需要研究一下，目前暂时不平移json文件

  const { fileUtil, sourceCodePath, packPath } = projectInfo

  const { files } = getFiles(projectInfo)

  files.forEach(item => {
    const extname = path.extname(item)

    if (!excludeExt[extname] && whiteFileExtName[extname]) {
      const file = fileUtil.getFile(item, null)
      writeFile({
        fileBuffer: file,
        srcFilePath: path.join(sourceCodePath, item),
        destFilePath: path.join(packPath, item)
      })
    }
  })
}
