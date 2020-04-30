const { NO_BOM_VAR } = require('../common/projectConfig')
const sourceMap = require("source-map")
const path = require('path')
const WXAppcode = require('./wxappcode')
const sourceMapHelper = require('../common/getSourceMap')
const compileHelper = require('./compileHelper')

const SPLIT_SYMBOL = '\n    '
let codeLen = 0;
let sourceMapGenerator = new sourceMap.SourceMapGenerator({
  file: ''
})

function getFiles(projectInfo) {
  let jsFiles = projectInfo.fileUtil.getAllJSFiles()

  const { appConfig, subPackageConfig } = projectInfo

  // 如果是分包模式
  if (appConfig.subPackages) {
    // 如果是子包，找出当前子包的文件
    if (subPackageConfig) {
      jsFiles = jsFiles.filter(file => {
        return file.indexOf(subPackageConfig.root) === 0
      })
    } else {
      // 过滤掉分包中文件 找出主包中的文件
      let _jsFiles = jsFiles.filter(file => {
        let flag = true
        appConfig.subPackages.forEach(config => {
          if (file.indexOf(config.root) === 0) {
            flag = false
          }
        });
        return flag
      })
      // 否则如果是主包，直接用主包中的文件
      jsFiles = _jsFiles
    }
  }

  return {
    jsFiles
  }
}

class MergeJS {
  constructor(projectInfo, wxml, wxss) {
    this.projectInfo = projectInfo
    this.wxml = wxml
    this.wxss = wxss
  }

  async generate() {
    const projectInfo = this.projectInfo
    const { appConfig, subPackageConfig } = projectInfo
    const wxss = this.wxss
    const { fileUtil } = projectInfo

    const { jsFiles } = getFiles(projectInfo)
    const useAndComponents = compileHelper.getComponentFileList(projectInfo, appConfig, subPackageConfig) // 包括components自身和用到components的page。注意，这里没有后缀

    let jsStr = '';
    let wxAppCodes = [];
    let wxmlCode = '';
    // 如果没有用到组件，就不要把这两个代码打进去了
    if (useAndComponents && useAndComponents.length > 0) {
      wxAppCodes = await new WXAppcode(projectInfo, wxss).generate()

      let result = await this.wxml.generate(); // wxml
      wxmlCode = result.code
    }

    const jsHead =
      'var __wxAppData = __wxAppData || {};   var __wxRoute = __wxRoute || "";  var __wxRouteBegin = __wxRouteBegin || "";  var __wxAppCode__ = __wxAppCode__ || {};  var global = global || {};  var window = window || {};  var __WXML_GLOBAL__=__WXML_GLOBAL__ || {};  var __wxAppCurrentFile__=__wxAppCurrentFile__||"";  var Component = Component || function(){};  var definePlugin = definePlugin || function(){};  var requirePlugin = requirePlugin || function(){};  var Behavior = Behavior || function(){};'
    // 如果是整包或分包的主包或者是独立分包，app-service要加上js头部
    if (!appConfig.subPackages || !subPackageConfig || subPackageConfig.independent) {
      jsStr = `${ jsHead }${ SPLIT_SYMBOL }`;
    }
    jsStr = `${jsStr}${wxmlCode}${wxAppCodes.join('\n')}`;

    /**
     * js文件暂时分三种，主文件app，页面入口文件（在app.json中定义），其他js文件
     * 每种文件有各自的处理方法
     **/
    const appFile = [],
      componentFiles = [],
      pageFiles = [],
      otherFiles = []

    const appCodes = [],
      pageCodes = [],
      allJsDefineCode = [] //先要把所有用到的js都加载好（执行define,这样就不会因为还没define就引用导致报错）

    //将所有JS文件分类
    jsFiles.forEach(item => {

      const fileName = item.replace(/\.js$/, '')

      if (fileName === "app") {
        appFile.push(item)
      } else if (appConfig.pages.includes(fileName)) {
        const data = {
          file: item,
          component: false
        };

        pageFiles.push(data);
      } else if (useAndComponents.includes(fileName)) {
        const data = {
          file: item,
          component: true
        };
        componentFiles.push(data);
      } else {
        otherFiles.push(item);
      }
    })

    let tempCode = '';
    let tempRoute = '';
    codeLen = jsStr.split("\n").length;
    /*
      content中的顺序如下，sourcemap也要按顺序生成：
      let contentStr = `${wxmlCode}
          ${wxAppCodes.join('\n')}
          ${otherCodes.join('\n')}
          ${appCodes.join('\n')}
          ${pageCodes.join('\n')}`
    */
    //处理其他js文件，这些文件不需要默认require，用到的时候再require就行
    otherFiles.forEach(async item => {
      tempCode = fileUtil.getFile(item)

      allJsDefineCode.push(`define("${item}", function(require, module, exports, ${NO_BOM_VAR}){${SPLIT_SYMBOL}${tempCode}\n});`);
      codeLen++;
      let tempCodeLen = await generateSourcemap(path.join(projectInfo.sourceCodePath, item), tempCode);
      codeLen += tempCodeLen + 1;
    })

    //处理app.js
    appFile.forEach(async item => {
      tempCode = fileUtil.getFile(item)

      allJsDefineCode.push(
        `define("${item}", function(require, module, exports, ${NO_BOM_VAR}){\n${tempCode}${SPLIT_SYMBOL}});`
      );
      appCodes.push(`require("${item}");`);
      codeLen++;
      let tempCodeLen = await generateSourcemap(path.join(projectInfo.sourceCodePath, item), tempCode);
      codeLen += tempCodeLen + 1;
    })

    //然后处理组件和页面文件
    componentFiles.concat(pageFiles).forEach(async item => {

      const { file, component } = item;

      tempCode = fileUtil.getFile(file);

      tempRoute = file.split(".")[0];

      const wxAppCurrentFile = `__wxAppCurrentFile__ = "${file}";`;
      allJsDefineCode.push(
        `define("${file}", function(require, module, exports, ${NO_BOM_VAR}){${SPLIT_SYMBOL}${tempCode}\n});`
      );
      pageCodes.push(
        `__wxRoute = "${tempRoute}";__wxRouteBegin = true;${wxAppCurrentFile}require("${file}");`
      );
      codeLen++;
      let tempCodeLen = await generateSourcemap(
        path.join(projectInfo.sourceCodePath, file),
        tempCode
      );
      codeLen += tempCodeLen + 1;
    })

    let contentStr = `
${allJsDefineCode.join('\n')}
${appCodes.join('\n')}
${pageCodes.join('\n')}`

    jsStr = `${ jsStr }${ contentStr }`;


    // 不需要压缩，各个文件代码上传前做压缩
    // if (projectInfo.inMinifyList) {
    //   try {
    //     let result = UglifyJS.minify(jsStr)
    //     if (result.error) {
    //       throw result.error
    //     } else {
    //       jsStr = result.code
    //     }
    //   } catch (err) {
    //     logger.error(`html-minifier error for appservice. err: ${ err.stack || err}`)
    //   }
    // }

    return {
      code: jsStr,
      sourcemap: sourceMapGenerator.toString()
    }
  }
}

async function generateSourcemap(filePath, codeStr) {
  let initSourceMap = sourceMapHelper.getSourceMap(filePath);
  let fileName = path.basename(filePath);
  if (initSourceMap) {
    sourceMap.SourceMapConsumer.initialize({
      "lib/mappings.wasm": "https://qzonestyle.gtimg.cn/qzone/qzact/act/external/devtool/mappings.wasm"
    });
    let sourceMapConsumer = await new sourceMap.SourceMapConsumer(initSourceMap);
    sourceMapGenerator.setSourceContent(fileName, initSourceMap.sourcesContent[0]);
    sourceMapConsumer.eachMapping((mapping) => {
      if (typeof mapping.originalLine !== 'number' ||
        typeof mapping.originalColumn !== 'number') {
        return
      }
      sourceMapGenerator.addMapping({
        generated: {
          line: codeLen + mapping.generatedLine,
          column: mapping.generatedColumn
        },
        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn
        },
        source: fileName,
        name: mapping.name
      })
    })
    return codeStr.split('\n').length;
  } else {
    sourceMapGenerator.setSourceContent(fileName, codeStr);
    let len = codeStr.split('\n').length;
    for (let a = 1; a <= len; a++) {
      sourceMapGenerator.addMapping({
        generated: {
          line: codeLen + a,
          column: 0
        },
        original: {
          line: a,
          column: 0
        },
        source: fileName
      })
    }
    return len
  }
}

module.exports = MergeJS
