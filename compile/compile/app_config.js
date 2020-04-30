const path = require('path')
const compileHelper = require('./compileHelper')
const FileUtil = require("../files/fileUtil");
function generateAppConfig(projectInfo, appJson) {
  let appConfig = Object.assign({
    PackageToolVersion: projectInfo.version
  }, appJson)

  let mainPages = [],
    subPages = [];

  mainPages = appConfig.pages
  if (appConfig.subpackages) {
    appConfig.subPackages = appConfig.subpackages;
    delete appConfig.subpackages;
  }

  // 如果有分包的配置，则将分包配置全部合并到主包中
  if (appConfig.subPackages && appConfig.subPackages.length > 0) {
    appConfig.subPackages.forEach(subpack => {
      if (subpack.root && subpack.pages && subpack.pages.length > 0) {
        let pages = []
        subpack.pages.forEach(page => {
          let fullPage = path.join(subpack.root, page);
          fullPage = fullPage.replace(/\\/g, '/')
          pages.push(fullPage)
          if (!subPages.includes(fullPage)) {
            subPages.push(fullPage)
          }
        })
        subpack.pages = pages
      }
    })
  }

  appConfig.pages = mainPages.concat(subPages)
  appConfig.mainPages = mainPages
  appConfig.entryPagePath = appConfig.entryPagePath ? `${appConfig.entryPagePath}.html` : `${appConfig.pages[0]}.html`
  // 预览版本要开启debug，终端才会有log
  if (projectInfo.debug == undefined) { // 预览包不强制，上传包强制false
    appConfig.debug = !!appConfig.debug
  } else {
    appConfig.debug = false;
  }

  if (appConfig.localFilePathCompatible == undefined) {
    appConfig.localFilePathCompatible = false;
  } else {
    appConfig.localFilePathCompatible = !!appConfig.localFilePathCompatible
  }

  appConfig.networkTimeout = Object.assign({
    request: 6e4,
    uploadFile: 6e4,
    connectSocket: 6e4,
    downloadFile: 6e4
  }, appConfig.networkTimeout)

  appConfig.global = {
    window: appJson.window || {}
  }

  //写入全局及单独页面的配置
  appConfig.page = {}
  appConfig.pages.forEach(page => {
    let json = compileHelper.checkJSONFile(projectInfo, page)
    if (json) {
      appConfig.page[`${page}.html`] = {
        window: json
      }
    }
  })

  //tabBar配置，list里面的图片需要转换成base64
  if (appConfig.tabBar) {
    if (appConfig.tabBar.list && appConfig.tabBar.list.length > 0) {
      const {
        fileUtil
      } = projectInfo
      appConfig.tabBar.list.forEach(item => {
        const {
          iconPath,
          selectedIconPath
        } = item
        if (iconPath) {
          item.iconData = Buffer.from(fileUtil.getFile(iconPath, 'binary'), 'binary').toString('base64')
          delete item.iconPath
        }
        if (selectedIconPath) {
          item.selectedIconData = Buffer.from(fileUtil.getFile(selectedIconPath, 'binary'), 'binary').toString('base64')
          delete item.selectedIconPath
        }
        //按终端规范，这里需要补齐后缀
        item.pagePath = `${item.pagePath}.html`
      })
    }
  }
  return appConfig
}

/**
 * 生成app-config
 * @param {object} projectInfo 项目信息 
 */
module.exports = async function (projectInfo) {
  const { sourceCodePath } = projectInfo
  projectInfo.fileUtil = new FileUtil(sourceCodePath)
  let appJson = compileHelper.checkAppJSON(projectInfo)
  let appConfig = generateAppConfig(projectInfo, appJson)
  return appConfig
}
