'use strict';
const template = require('./template')
const fs = require('fs')
const path = require('path')
const { minify } = require('html-minifier')
const compileHelper = require('./compileHelper')
const WXAppcode = require('./wxappcode')
const logger = require('../common/logger')
const mkdirp = require('mkdir-p')


module.exports = async function (projectInfo, wxml, wxss) {
  const { packName, appConfig, subPackageConfig } = projectInfo
  let distPath = path.join(projectInfo.packPath, subPackageConfig ? subPackageConfig.root : '')
  mkdirp.sync(distPath)

  let codeBegin, codeEnd, filePath

  // 防止开发者这样搞 "subPackages": []
  if (!appConfig.subPackages || (appConfig.subPackages && appConfig.subPackages.length == 0)) {
    // 整包
    codeBegin = template.htmlBegin
    codeEnd = template.htmlEnd
    filePath = path.join(distPath, 'page-frame.html')
  } else {
    if (!subPackageConfig) {
      // 主包
      codeBegin = template.jsBegin
      codeEnd = template.jsEnd
      filePath = path.join(distPath, 'app-wxss.js')
    } else {
      // 子包
      codeBegin = template.subJsBegin
      codeEnd = template.subJsEnd
      filePath = path.join(distPath, 'page-frame.js')
    }
  }

  let jsCode = [codeBegin]
  let result = await wxml_wxss(wxml, wxss, packName);
  let wxmlcode = result[0].code;
  jsCode.push(wxmlcode);
  let wxappwxss = result[1];
  if (wxappwxss) {
    jsCode.push(compileHelper.formatWXSS(wxappwxss))
  }
  //let wxml_start = +new Date;
  // let wxmlcode = await wxml.generate() // wxml

  // //logger.info(`${ packName }: wxml generate done! cost::`,+new Date-wxml_start)
  // jsCode.push(wxmlcode.code)

  // //let wxss_start = +new Date;
  // let wxappwxss = await wxss.generate() // wxss


  // //logger.info(`${ packName }: wxss generate done! cost::`,+new Date-wxss_start)
  // if (wxappwxss) {
  // 	jsCode.push(formatWXSS(wxappwxss))
  // }

  let wxcode = await new WXAppcode(projectInfo, wxss).generate(false) // appcode
  jsCode = jsCode.concat(wxcode)

  jsCode.push(codeEnd)

  jsCode = jsCode.join('\n')

  // if(projectInfo.inMinifyList){
  // 	try {
  // 		let miniHtml = minify(jsCode, {
  // 			collapseWhitespace: true,
  // 			minifyJS: true
  // 		})
  // 		jsCode = miniHtml
  // 	} catch(err) {
  // 		logger.error(`jsCode-minifier error for page-frame. err: ${ err.stack || err}`)
  // 	}
  // }

  fs.writeFileSync(filePath, jsCode)
  if (appConfig.subPackages && !subPackageConfig) {
    // 分包的主包
    fs.writeFileSync(path.join(distPath, 'page-frame.js'), template.pageframeBegin)
  }
}

function wxml_wxss(wxml, wxss, packName) {
  return new Promise((resolve, reject) => {
    let start = Date.now();
    let wxml_promise = wxml.generate();
    let wxss_promise = wxss.generate();
    Promise.all([wxml_promise, wxss_promise]).then(value => {
      let end = Date.now();
      // logger.error(`${packName} wxml wxss total cost:::::`, end - start);
      resolve(value);
    }).catch(err => {
      reject(err)
    })
  })
}
