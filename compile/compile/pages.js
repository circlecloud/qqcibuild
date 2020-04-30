const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdir-p')
const { minify } = require('html-minifier')
const template = require('./template')
const compileHelper = require('./compileHelper');
const logger = require('../common/logger')

/**
 * 获取当前包的wxml文件
 * @param {object} projectInfo 项目信息
 */
function getFiles(projectInfo) {
  let wxmlFiles = projectInfo.fileUtil.getAllWXMLFiles()

  const { appConfig, subPackageConfig } = projectInfo

  // 如果是分包模式
  if (appConfig.subPackages) {
    // 如果是子包，用子包文件
    if (subPackageConfig) {
      wxmlFiles = wxmlFiles.filter(file => {
        return file.indexOf(subPackageConfig.root) === 0
      })
    } else {
      // 否则如果是主包，直接用主包中的文件

      // 过滤掉分包中文件 找出主包中的文件
      let _wxmlFiles = wxmlFiles.filter(file => {
        let flag = true
        appConfig.subPackages.forEach(config => {
          if (file.indexOf(config.root) === 0) {
            flag = false
          }
        });
        return flag
      })

      wxmlFiles = _wxmlFiles
    }
  }

  return {
    wxmlFiles
  }
}

async function generateEachPage(page, projectInfo, wxml, wxss, isInPageFrame) {
  let { appConfig, subPackageConfig } = projectInfo
  let pageWindow = appConfig.global && appConfig.global.window || {};
  if (appConfig && appConfig.page && appConfig.page[`${ page }.html`]) {
    pageWindow = Object.assign({}, pageWindow, appConfig.page[`${ page }.html`].window)
  }

  let pageGlobal = { window: pageWindow }
  // TODO 这里有一段分包和插件的逻辑

  const cssArr = [template.cssBegin, template.cssTimeBegin]
  const wxmlcode = await wxml.generate()

  if (isInPageFrame) {
    cssArr.push(`__wxAppCode__['${ page }.wxss']();`)
  } else {
    let wxsscode = await wxss.generate(page)

    if (wxsscode) {
      let code = compileHelper.formatWXSS(wxsscode)
      cssArr.push(`${ code }();`)
    } else {
      cssArr.push('setCssToHead([])();')
    }
  }

  cssArr.push(template.cssTimeEnd)
  cssArr.push(`
    document.dispatchEvent(new CustomEvent( "generateFuncReady", {detail: { generateFunc: ${ wxmlcode.name }('./${ page }.wxml')}}))`
  )
  if (pageGlobal.window.disableScroll) {
    cssArr.push(`
        var style = document.createElement('style')
        style.innerText = 'body{overflow-y:hidden;}'
        document.head.appendChild(style)
    `);
  }
  cssArr.push(template.cssEnd)

  let distFile = path.join(projectInfo.packPath, `./${ page }.html`),
    distDir = path.dirname(distFile),
    html = cssArr.join('')

  if (projectInfo.inMinifyList) {
    try {
      let miniHtml = minify(html, {
        collapseWhitespace: true,
        minifyJS: true
      })
      html = miniHtml
    } catch (err) {
      logger.error(`html-minifier error for pages. err: ${ err.stack || err}`)
    }
  }
  mkdirp.sync(distDir)
  fs.writeFileSync(distFile, html)
}

module.exports = async function(projectInfo, wxml, wxss) {
  let { appConfig, subPackageConfig } = projectInfo
  const { wxmlFiles } = getFiles(projectInfo)
  const files = compileHelper.getComponentFileList(projectInfo, appConfig, subPackageConfig) // 这个是会打到page_frame中的

  for (let i = 0, len = wxmlFiles.length; i < len; i++) {
    let filename = wxmlFiles[i].replace(/\.wxml$/, ''),
      isInPageFrame = files.indexOf(filename) > -1
    await generateEachPage(filename, projectInfo, wxml, wxss, isInPageFrame)
  }
}
