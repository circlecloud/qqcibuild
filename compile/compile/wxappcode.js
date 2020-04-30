const path = require("path");
const compileHelper = require('./compileHelper');

function getJsonFile(projectInfo, filePath) {
  let { appConfig, subPackageConfig } = projectInfo
  let subPackage = compileHelper.checkIsInSubPackage(appConfig, filePath),
    filesWithMainPack = compileHelper.getFileListWithMainPack(projectInfo, appConfig, subPackageConfig),
    dirname = path.posix.dirname(filePath),
    config = compileHelper.checkJSONFile(projectInfo, filePath)

  if (config.usingComponents && Object.keys(config.usingComponents).length > 0) {
    let regFiles = {},
      files = {}

    for (let name in config.usingComponents) {
      let value = config.usingComponents[name] || '',
        names = name.split('*'),
        values = value.split('*')

      if (names.length > 1) {
        value = path.posix.normalize(value)
        value = path.posix.isAbsolute(value) ? value : `/${path.posix.join(dirname, value)}`
        regFiles[name] = value
      } else {
        // plugins这里看下是从哪里取，app.config还是挂在projectInfo下面
        // 这里plugin的还不支持，先挂在projectInfo下面
        if (projectInfo.plugins || subPackage && subPackage.plugins) {
          files[name] = value.replace(/^plugin:\/\/([^\/]*)\/(.*)/, (a, b, c, d, f) => {
            let g = projectInfo.plugins && projectInfo.plugins[b] || subPackage && subPackage.plugins && subPackage.plugins[b]
            return g ? `plugin://${g.provider}/${c}` : f
          })
        } else {
          files[name] = value
        }
      }
    }

    if (Object.keys(regFiles).length > 0) {
      for (let key in regFiles) {
        let value = regFiles[key],
          reg = new RegExp(value.replace(/\*/g, '([^/]*)'))

        filesWithMainPack.forEach(file => {
          file = '/' + file
          let result = file.match(reg)
          if (!result) return
          let i = 1,
            _name = name.replace(/\*/g, function() {
              return result[i++]
            })

          files[_name] = file
        })
      }
    }
    config.usingComponents = files
  }

  return config
}

class WXAppcode {
  constructor(projectInfo, wxss) {
    this.projectInfo = projectInfo
    this.wxss = wxss
  }

  async generate(isAppService = true) {
    let name = '$gwx', // name这里有分包逻辑
      { appConfig, subPackageConfig } = this.projectInfo

    if (subPackageConfig && !subPackageConfig.independent) {
      name = `$${ Buffer.from(subPackageConfig.root).toString('hex') }`
    }

    let files = compileHelper.getComponentFileList(this.projectInfo, appConfig, subPackageConfig),
      arr = []

    for (let i = 0, len = files.length; i < len; i++) {
      let file = files[i],
        filename = file.replace(/\"/g, '\\"'),
        json = getJsonFile(this.projectInfo, file);

        
        if (isAppService) {
          // appservice里需要加入json
          arr.push(`__wxAppCode__["${ filename }.json"]=${ JSON.stringify(json) }`)
        } else {
          let wxsscode = await this.wxss.generate(file)
          // pageframe里需要加入wxss
          // 业务源码有可能只有wxml和js文件，没有wxss文件，所以wcsc.exe不会编译出来。wxsscode会为undefined
          // 这里加下判断
          arr.push(`__wxAppCode__["${ filename }.wxss"]=${ wxsscode ? compileHelper.formatWXSS(wxsscode): 'setCssToHead([])' }`)
        }

      arr.push(`__wxAppCode__["${ filename }.wxml"]=${ name }("./${ filename }.wxml")`)
    }

    return arr
  }
}

module.exports = WXAppcode
