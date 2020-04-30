const path = require('path')
const fs = require('fs')
const mkdir = require('mkdir-p')
const FileUtil = require('../common/fileUtil')
const Wxml = require('./wxml')
const Wxss = require('./wxss')
const pageFrame = require('./page_frame')
const appService = require('./appService')
const pages = require('./pages')
const otherFiles = require('./otherFiles')
const workers = require('./workers')
const pack = require("./pack")
const logger = require('../common/logger');
const compileHelper = require('./compileHelper')

module.exports = async function compile(projectInfo, appconfig, subPackage, setting) {
  let sourceCodePath = projectInfo.sourceCodePath;
  const packName = projectInfo.packName = !appconfig.subPackages ? '__APP__' : (subPackage ? `${subPackage.root}` : '__APP__')
  const packPath = projectInfo.packPath = path.join(projectInfo.buildPath, packName.replace(/\//g, '_'))
  mkdir.sync(packPath)

  projectInfo.appConfig = appconfig // appconfig.subPackages存在表示为分包模式
  projectInfo.subPackageConfig = subPackage // 当前分包配置，为空表示主包，非空表示子包

  let mainPages = appconfig.mainPages
  delete appconfig.mainPages

  // 整包或者分包的主包或者独立分包，才需要写入app-config.json
  if (!subPackage || !appconfig.subPackages) {
    fs.writeFileSync(path.join(packPath, 'app-config.json'), JSON.stringify(appconfig))
    // logger.info(`${ packName }: generate app-config.json done!`)
    if (appconfig.workers) { // 整包或者独立分包的主包才编译workers
      await workers(projectInfo, packPath, appconfig.workers);
    }
  } else if (subPackage && subPackage.independent) {
    let distPath = path.join(packPath, subPackage.root)
    mkdir.sync(distPath);
    fs.writeFileSync(path.join(distPath, 'app-config.json'), JSON.stringify(appconfig))
    // logger.info(`${ packName }: generate app-config.json done!`)
  }

  // 主包的pages，编译时只需要主包的page
  if (appconfig.subPackages && !subPackage) {
    appconfig.pages = mainPages
  }

  const fileUtil = new FileUtil(sourceCodePath)
  projectInfo.fileUtil = fileUtil;

  const wxml = new Wxml(projectInfo, setting)
  const wxss = new Wxss(projectInfo, setting)

  let pageFrame_start = +new Date;
  await pageFrame(projectInfo, wxml, wxss) // 生成page-frame.html
  // logger.info(`${packName}: generate page-frame.html done! cost::`, +new Date - pageFrame_start)

  let appService_start = +new Date;
  await appService(projectInfo, wxml, wxss) //生成app-service
  // logger.info(`${packName}: generate app-service done! cost::`, +new Date - appService_start)

  let pages_start = +new Date;
  await pages(projectInfo, wxml, wxss) //生成各页面的样式
  // logger.info(`${packName}: generate pages done! cost::`, +new Date - pages_start)

  let otherFiles_start = +new Date;
  await otherFiles(projectInfo) //处理其他文件
  let otherFiles_end = +new Date - otherFiles_start;
  // logger.info(`${packName}: other files done! cost::`, otherFiles_end)

  let path_start = +new Date;
  let apkgPath = packPath + '.wxapkg'
  let packInfo = await pack({
    srcPath: packPath,
    distPath: apkgPath
  }) // 打包成.wxapkg
  // logger.info(`${packName}: apkg files done! cost::`, +new Date - path_start)

  return {
    name: packName,
    size: packInfo.totalSize,
    packPath: apkgPath,
    pkgBuffer: packInfo.data,
    compileTime: {
      aotime: otherFiles_end,
    }
  }
}
