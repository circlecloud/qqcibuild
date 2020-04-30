const path = require("path")
const projectConfig = require('../common/projectConfig')
const fs = require('fs')

function getType(arg) {
  return Object.prototype.toString.call(arg).toLowerCase().split(' ')[1].replace(']', '')
}

// 判断页面是否是子包中
function checkIsInSubPackage(appConfig, filePath) {
  filePath = path.normalize(filePath)
  let subPackageConfig

  if (appConfig.subPackages) {
    for (let i = 0, len = appConfig.subPackages.length; i < len; i++) {
      let config = appConfig.subPackages[i],
        prefix = path.normalize(config.root + '/')

      if (filePath.indexOf(prefix) === 0) {
        subPackageConfig = config
        break
      }
    }
  }

  return subPackageConfig
}

function checkInGameSubPackage(gameConfig, filePath) {
  filePath = path.normalize(filePath)
  if (0 != filePath.indexOf('/')) {
    filePath = '/' + filePath;
  }
  let subPackageConfig;
  if (gameConfig.subPackages) {
    for (let i = 0, len = gameConfig.subPackages.length; i < len; i++) {
      let config = gameConfig.subPackages[i]
      if (!/\.js$/.test(config.root)) {

        let prefix = path.normalize(config.root + '/');
        if (0 == filePath.indexOf(prefix)) {
          subPackageConfig = config;
          break
        }
      } else if (filePath == config.root) {
        subPackageConfig = config;
        break
      }
    }

  }

  return subPackageConfig
}

// 校验并获取jsonfile
function checkPageJSON(projectInfo, filePath) {
  let fileFullPath = `${ filePath }.json`,
    exist = projectInfo.fileUtil.exists(fileFullPath);

  if (!exist) return {}

  let fileContent = projectInfo.fileUtil.getFile(fileFullPath)

  try {
    fileContent = JSON.parse(fileContent)
  } catch (err) {
    throw Error(`compile config jsonparse error|filePath: ${ fileFullPath }|${ err }`)
  }

  let ext = getExt(projectInfo)

  if (ext && ext.extPages && ext.extPages[filePath]) {
    fileContent = Object.assign({}, fileContent, ext.extPages[filePath])
  }

  let errs = [];

  ['enablePullDownRefresh', 'disableScroll'].forEach((key) => {
    if ('undefined' != typeof fileContent[key] && 'boolean' != typeof fileContent[key]) {
      errs.push(`${ key } 字段需为 boolean`)
    }
  })

  if (fileContent.backgroundColorTop) {
    fileContent.backgroundColor = fileContent.backgroundColorTop
  }

  if (errs.length > 0) {
    const error = new Error(errs.join('\n'));
    error.path = filePath;
    error.code = error_code.PAGES_JSON_PARSE_ERR;
    throw error;
  }
  if (fileContent.usingComponents) {
    checkUsingComponents(fileContent, {
      filePath,
      errs
    });
  }
  const appConfig = requireConfig(projectInfo.sourceCodePath, 'app.json');
  if (appConfig.usingComponents && !filePath.startsWith('miniprogram_npm')) {
    if (!fileContent.usingComponents) {
      fileContent.usingComponents = {};
    }
    for (let component in appConfig.usingComponents) {
      if (fileContent.usingComponents[component]) {
        continue;
      }
      const componentPath = appConfig.usingComponents[component] || '';
      const miniRoot = projectInfo.miniprogramRoot ? normalizePath(projectInfo.miniprogramRoot) : '.'
      const rootPath = projectInfo.miniprogramRoot ? path.join(projectInfo.sourceCodePath, miniRoot) : projectInfo.sourceCodePath;
      if (!componentPath.startsWith('/') && !componentPath.startsWith('plugin://')) {
        const p = path.resolve(rootPath, componentPath);
        const dirname = path.dirname(path.resolve(rootPath, filePath))
        const relativePath = path.relative(dirname, p);
        if (componentPath.startsWith('.')) {
          fileContent.usingComponents[component] = normalizePath(relativePath);
        } else if (!projectInfo.fileUtil.exists(p)) {
          const relativePath = resolveComponentPath(projectInfo.fileUtil, miniRoot, componentPath);
          fileContent.usingComponents[component] = relativePath ? normalizePath(path.relative(filePath, relativePath)) : normalizePath(relativePath)
        } else {
          fileContent.usingComponents[component] = normalizePath(relativePath)
        }

      } else {
        fileContent.usingComponents[component] = appConfig.usingComponents[component];
      }

    }
  }

  if (projectInfo.projectCfg.setting && projectInfo.projectCfg.setting.nodeModules) {
    checkComponentPath(projectInfo.fileUtil, fileContent, filePath)
  }
  return fileContent
}

function getExt(projectInfo) {
  // 这里看模拟器的逻辑platform为false 暂时不知ext.json是什么作用
  // if (!a.attr || !a.attr.platform) return;
  // let h, i, j = 'ext.json',
  //  k = await d(a);
  // try {
  //  h = k.getFile(j)
  // } catch (a) {
  //  return
  // }
  return
}

// 这里的逻辑是过滤掉不在当前包中的页面
// 如果当前包不是分包，判断当前页面是否位于任一分包中，如果是，过滤
// 如果当前包是分包，判断当前页面是否在该分包中，如果不是，过滤
function needFilter(file, appConfig, subPackageConfig) {
  if (!subPackageConfig) { // 整包或主包
    let flag = false
    // 主包，过滤掉子包的页面
    appConfig.subPackages && appConfig.subPackages.forEach(config => {
      if (file.indexOf(config.root) === 0) {
        flag = true
      }
    })

    if (flag) {
      return true
    }
  } else if (file.indexOf(subPackageConfig.root) !== 0) {
    // 子包，但是不在当前子包中，也过滤
    return true
  }
  return false
}

// wxml打包配置
function getCompileConfig(projectInfo) {
  let {
    appConfig,
    subPackageConfig
  } = projectInfo
  let params = [],
    wxmlCount = 0,
    jsonFiles = projectInfo.fileUtil.getAllJSONFiles()

  for (let i = 0, len = jsonFiles.length; i < len; i++) {
    let filename = jsonFiles[i].replace(/\.json$/, ''),
      dirname = path.posix.dirname(filename)

    if (path.normalize(filename) == path.normalize('app')) continue
    if (needFilter(filename, appConfig, subPackageConfig)) continue

    let config = checkPageJSON(projectInfo, filename)
    if (config.usingComponents || config.componentGenerics) {
      params.push(`./${ filename }.wxml`)
      let regFiles = {},
        files = config.usingComponents

      for (let name in config.usingComponents) {
        let value = config.usingComponents[name] || '',
          names = name.split('*'),
          values = value.split('*')

        if (names.length > 1) {
          value = normalizePath('/' + value)
          regFiles[name] = value
        } else {
          files[name] = value
        }
      }

      if (Object.keys(regFiles).length > 0) {
        for (let key in regFiles) {
          let value = regFiles[key],
            reg = new new RegExp(value.replace(/\*/g, '([^/]*)'))

          jsonFiles.forEach(file => {
            file = '/' + file
            let result = file.match(reg)
            if (!result) return
            let f = 1,
              _name = name.replace(/\*/g, function() {
                return result[f++]
              })

            files[_name] = file
          })
        }
      }

      files = Object.assign({}, files, config.componentGenerics)
      params.push(Object.keys(files).length)
      params = params.concat(Object.keys(files))
      wxmlCount++
    }
  }

  params.unshift(wxmlCount)
  return params
}

function checkUsingComponents(fileContent, extInfo) {
  if (fileContent.usingComponents) {
    if ('object' != getType(fileContent.usingComponents)) {
      throw Error('usingComponents 字段需为 object')
    }

    for (let name in fileContent.usingComponents) {
      let value = fileContent.usingComponents[name] || ''
      if ('string' != getType(value)) {
        extInfo.errs.push(`usingComponents['${ name }'] 字段需为 string`)
        continue
      }

      let names = name.split('*'),
        values = value.split('*')

      if (names.length != values.length) {
        extInfo.errs.push(`usingComponents['${ name }'] 中 * 的个数不匹配`)
        continue
      }

      if (1 < names.length && 0 == value.indexOf('plugin://')) {
        extInfo.errs.push(`usingComponents['${ name }'] 插件不支持 *`)
        continue
      }
    }

    if (extInfo.errs.length > 0) {
      const err = new Error(extInfo.errs.join('\n'));
      err.path = extInfo.filePath;
      err.code = -2;
      throw err
    }
  }
}

// 获取跟component有关的模块，包括component本身和用到component的page等
function getComponentFileList(projectInfo, appConfig, subPackageConfig) {
  let jsonFiles = projectInfo.fileUtil.getAllJSONFiles(),
    files = [];

  //过滤一下，只有同时存在json和wxml or js的文件才能认为是component
  let wxmlFiles = projectInfo.fileUtil.getAllWXMLFiles();
  let jsFiles = projectInfo.fileUtil.getAllJSFiles();
  let allFiles = wxmlFiles.concat(jsFiles).map(file => {
    return file.replace(/\.(wxml|qml|js)$/, "");
  });
  let allListSet = new Set(allFiles);
  jsonFiles = jsonFiles.filter(file => {
    return allListSet.has(file.replace(/\.json$/, ""));
  });

  for (let filename, i = 0, len = jsonFiles.length; i < len; i++) {
    filename = jsonFiles[i].replace(/\.json$/, '')
    if (path.normalize(filename) == path.normalize('app')) continue
    if (needFilter(filename, appConfig, subPackageConfig)) continue
    let config = checkPageJSON(projectInfo, filename)

    if (config.usingComponents || config.componentGenerics || true === config.component) {
      files.push(filename)
    }
  }
  return files
}

/**
 * 将wcsc.exe编译出来代码中换行、x22、x3d等进行转换
 * @param {string} wxsscode wcsc.exe编译出来的代码
 */
function formatWXSS(wxsscode) {
  let func = new Function(`return '${ wxsscode }'`)
  return func()
  // return wxsscode.replace(/([^\\])\\n/g, '$1\n').replace(/([^\\])\\\\n/g, '$1\\n').replace(/\\x22|\\x3d|\\x26|\\x27|\\x3e/g, function($0) {
  //         let str = ''
  //         switch($0){
  //             case '\\x22': str = '"';break;
  //             case '\\x26': str = '&';break;
  //             case '\\x27': str = '\'';break;
  //             case '\\x3d': str = '=';break;
  //             case '\\x3e': str = '>';break;
  //         }
  //         return str
  //     })
}

function getFileListWithMainPack(projectInfo) {
  let {
    appConfig,
    subPackageConfig
  } = projectInfo
  let files = getComponentFileList(projectInfo, appConfig)
  if (subPackageConfig) {
    let _files = getComponentFileList(projectInfo, appConfig, subPackageConfig)
    files = files.concat(_files)
  }
  return files
}

/**
 * 删掉appconfig中整包编译不需要的字段
 * @param {object} appconfig
 */
function stripAppconfig(appconfig) {
  ['subPackages', 'preloadRule'].forEach(key => {
    delete appconfig[key]
  })
}

function normalizePath(filePath) {
  let normalPath = path.normalize(filePath);
  normalPath = normalPath.replace(/\\/g, '/');
  if ((filePath.startsWith('//') || filePath.startsWith('\\\\')) && !normalPath.startsWith('//')) {
    return '/' + normalPath
  } else {
    return normalPath
  }
}

function checkGameJSON(projectInfo) {
  let srcPath = projectInfo.sourceCodePath
  const fileStr = projectInfo.fileUtil.getFile('game.json');
  let gameJson = {};
  try {
    gameJson = JSON.parse(fileStr)
  } catch (err) {
    throw Error('game.json parse error')
  }
  let name = 'subPackages';
  if (gameJson.subpackages) {
    name = 'subpackages';
    gameJson.subPackages = gameJson.subpackages;
    delete gameJson.subpackages;
  }
  const deviceOrientation = gameJson.deviceOrientation;
  if (deviceOrientation) {
    if (getType(deviceOrientation) === 'string') {
      if (!["portrait", "landscape", "landscapeLeft", "landscapeRight"].includes(deviceOrientation)) {
        throw Error('deviceOrientation should be portrait || landscape || landscapeLeft || landscapeRight')
      }
    } else {
      throw Error('deviceOrientation should be string')
    }
  }

  if (gameJson.networkTimeout && getType(gameJson.networkTimeout) !== 'object') {
    throw Error('networkTimeout should be object')
  }
  const openDataContext = gameJson.openDataContext;
  if (gameJson.openDataContext || gameJson.subContext) {
    let dataContext = (gameJson.openDataContext || gameJson.subContext).replace("./", "");
    if (!/\/$/.test(dataContext)) {
      dataContext = `${dataContext}/`
    }
    if ("/" === dataContext || "./" === dataContext || 0 === dataContext.indexOf(".")) {
      throw Error('openDataContext subContext directory setting not legal')
    }
    if (!fs.existsSync(path.join(srcPath, dataContext))) {
      throw Error('openDataContext subContext should be directory')
    } else {
      const status = fs.statSync(path.join(srcPath, dataContext));
      if (!status.isDirectory()) {
        throw Error('openDataContext subContext should be directory')
      }
    }
    const entryPath = path.join(dataContext, openDataContext ? "index.js" : "sub.js");
    if (!projectInfo.fileUtil.exists(entryPath)) {
      throw Error(`${entryPath} not exists`)
    }
    if (openDataContext) {
      gameJson.openDataContext = normalizePath(dataContext)
      gameJson.subContext = normalizePath(dataContext)
    } else {
      gameJson.subContext = normalizePath(dataContext)
    }
  }
  checkNavToMiniProgram(projectInfo, gameJson);
  checkGameSubpackages(srcPath, gameJson);
  checkGroupIdList(projectInfo, gameJson);
  return gameJson;
}

function checkAppJSON(projectInfo) {
  const fileStr = projectInfo.fileUtil.getFile('app.json');
  let appJson = {};
  try {
    appJson = JSON.parse(fileStr)
  } catch (err) {
    throw Error('app.json parse error')
  }
  if (getType(appJson.entryPagePath) === 'string') {
    pathCheck(appJson.entryPagePath, 'entryPagePath')
  }
  const pages = appJson.pages || [];
  if (getType(pages) !== 'array' || pages.length === 0) {
    throw Error('APP_JSON_ENTRANCE_NOT_FOUND_ERR')
  }
  let flag = !appJson.entryPagePath;
  const pageFlag = {};
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    pathCheck(page, `pages[${i}]`);
    if (pageFlag[page]) {
      throw Error('pages repeat')
    }
    pageFlag[page] = true;
    if (!flag && page !== appJson.entryPagePath) {
      flag = true;
    }
    if (!fs.existsSync(path.join(projectInfo.sourceCodePath, `${page}\.wxml`))) {
      throw Error(`app.json pages ${page}\.wxml not exists`);
    }
    if (!fs.existsSync(path.join(projectInfo.sourceCodePath, `${page}\.js`))) {
      throw Error(`app.json pages ${page}\.js not exists`);
    }
  }
  checkTabBar(projectInfo, appJson);
  // const compileType = projectInfo.compileType;
  // todo 检查compileType
  let subFlag = checkSubPackage(projectInfo.sourceCodePath, appJson);
  flag = flag || subFlag;
  if (!flag) {
    throw Error('subPackages error')
  }
  checkPreloadRule(appJson);
  checkWorkers(projectInfo.sourceCodePath, appJson);
  let errs = [];
  if (appJson.window) {
    ['enablePullDownRefresh'].forEach((item) => {
      'undefined' != typeof appJson.window[item] && 'boolean' != typeof appJson.window[item] && errs.push('enablePullDownRefresh should be boolean')
    })
  }

  if (appJson.usingComponents) {
    checkUsingComponents(appJson, {
      filePath: 'app.json',
      errs
    })
  }
  if (appJson.permission) {
    let permission = appJson.permission
    for(let key in permission){
      if(!permission[key].desc){
        throw Error(`appJson.permission.${key}.desc should not be empty`);
      }
      if(permission[key].desc.length > 30){
        throw Error(`appJson.permission.${key}.desc should not be less than 30`);
      }
    }
  }

  checkNavToMiniProgram(projectInfo, appJson);
  if (errs.length > 0) {
    throw Error('app.json content error')
  }
  return appJson;

}

function checkNavToMiniProgram(projectInfo, appJson) {
  const errs = [];
  const setting = projectConfig.setting;
  if (appJson.navigateToMiniProgramAppIdList) {
    if (getType(appJson.navigateToMiniProgramAppIdList) !== 'array') {
      throw Error('navigateToMiniProgramAppIdList should be array');
    }
    appJson.navigateToMiniProgramAppIdList.forEach((item, index) => {
      if (getType(item) !== 'string') {
        errs.push(`navigateToMiniProgramAppIdList[${index}] should be string`)
      }
    });
    const limit = setting.NavigateMiniprogramLimit;
    if (appJson.navigateToMiniProgramAppIdList.length > limit) {
      errs.push(`navigateToMiniProgramAppIdList should be less than ${limit}`)
    }
  }
  if (errs.length > 0) {
    throw Error(errs.join('\n'))
  }
}

function checkGroupIdList(projectInfo, appJson){
  const errs = [];
  const setting = projectConfig.setting;

  let groupIdList = appJson.groupIdList;
  if(groupIdList){
    if(getType(groupIdList) !== 'array'){
      throw Error('groupIdList should be array');
    }
    groupIdList.forEach((item, index)=>{
      if(getType(item) !== 'string'){
        errs.push(`groupIdList[${index}] should be string`);
      }
    });
    const limit = setting.GroupIdListLimit;
    if(groupIdList.length > limit){
      errs.push(`groupIdList should be less than ${limit}`);
    }
    if (errs.length > 0) {
      throw Error(errs.join('\n'))
    }
  }
}

function checkTabBar(projectInfo, appJson) {
  const srcPath = projectInfo.sourceCodePath;
  const setting = projectConfig.setting;
  const pages = appJson.pages;
  const tabBar = appJson.tabBar;
  const extList = ['.png', '.jpg', '.jpeg'];
  let errs = [];
  if (tabBar) {
    if (getType(tabBar.list) !== 'array') {
      throw Error('tabBar.list should be list')
    }
    if (tabBar.list.length < setting.MinTabbarCount) {
      throw Error(`tabBar.length should be at lease ${setting.MinTabbarCount}`)
    }
    if (tabBar.list.length > setting.MaxTabbarCount) {
      throw Error(`tabBar.length should be at most ${setting.MaxTabbarCount}`)
    }
    ['color', 'selectedColor', 'backgroundColor'].forEach((item) => {
      if (!tabBar[item]) {
        throw Error(`tabBar.${item} is empty`);
      }
      if (!isHexColor(tabBar[item])) {
        throw Error(`tabBar.${item} should be HexColor`);
      }
    })
    for (let i = 0; i < tabBar.list.length; i++) {
      let tab = tabBar.list[i];
      if (getType(tab) !== 'object') {
        errs.push('tabBar setting should be object');
        continue;
      }
      if (getType(tab.text) !== 'string') {
        errs.push(`tabBar.list[${i}].text should be string`);
        continue;
      }
      const pagePath = tab.pagePath;
      pathCheck(pagePath, `tabBar.list[${i}].pagePath`)
      if (!pagePath) {
        errs.push(`tabBar.list[${i}].pagePath empty`);
        continue;
      }
      if (pages.indexOf(pagePath) < 0) {
        errs.push(`appJSON tabBar.list[${i}].pagePath "${pagePath}" 需在 pages 数组中`)
        continue;
      }
      let iconArray = [];
      if (tab.iconPath) {
        let iconPath = path.join(srcPath, tab.iconPath);
        tab.iconPath = path.relative(srcPath, iconPath);
        iconArray.push({
          name: 'iconPath',
          path: iconPath
        })
      }
      if (tab.selectedIconPath) {
        let selectedIconPath = path.join(srcPath, tab.selectedIconPath);
        tab.selectedIconPath = path.relative(srcPath, selectedIconPath);
        iconArray.push({
          name: 'selectedIconPath',
          path: selectedIconPath
        })
      }

      iconArray.forEach(item => {
        if (!fs.existsSync(item.path)) {
          return errs.push(`${item.name} ${item.path} not found`);
        }
        let fileStat = fs.statSync(item.path);
        if (fileStat.isDirectory()) {
          return errs.push(`${item.name} ${item.path} should not be directory`);
        }
        if (fileStat.size > 1024 * setting.MaxTabbarIconSize) {
          errs.push(`tabbar icon size should be less than ${setting.MaxTabbarIconSize}`)
        }
        let extname = path.extname(item.path);
        if (extList.indexOf(extname) < 0) {
          errs.push(`tabbar icon ext:${extname} invalid`)
        }
      })
    }
  }
  if (errs.length > 0) {
    throw Error(errs.join('\n'))
  }
}

function checkPreloadRule(appJson) {
  if (appJson.preloadRule && appJson.subPackages) {
    if (getType(appJson.preloadRule) !== 'object') {
      throw Error('preloadRule should be object')
    }
    let errs = [];
    let allPages = [].concat(appJson.pages);
    let subFlag = {};
    let subName = {};
    for (let a = 0; a < appJson.subPackages.length; a++) {
      const subpageCfg = appJson.subPackages[a];
      const subpage = subpageCfg.pages.map(item => {
        let pagePath = path.join(subpageCfg.root, item)
        return pagePath.replace(/\\/g, '/')
      });
      subFlag[subpageCfg.root] = true;
      if (subpageCfg.name) {
        subName[subpageCfg.name] = true;
        allPages = allPages.concat(subpage)
      }
    }
    for (const path in appJson.preloadRule) {
      if (allPages.indexOf(path) === -1) {
        errs.push(`preloadRule ${path} not found`);
        continue;
      }
      const rule = appJson.preloadRule[path];
      if (rule.network) {
        if (getType(rule.network) !== 'string') {
          errs.push('preloadRule[${path}].network should be string');
          continue
        }
        if (['all', 'wifi'].indexOf(rule.network) === -1) {
          errs.push('preloadRule[${path}].network should be all/wifi');
          continue
        }
      }
      if (getType(rule.packages) !== 'array') {
        errs.push('preloadRule[${path}].packages should be array');
        continue
      }
      let packages;
      for (let i = 0; i < rule.packages.length; i++) {
        packages = rule.packages[i];
        //packages  StringArray 进入页面后预下载分包的 root 或 name
        if (packages !== projectConfig.MINI_PROGRAM_MAIN_PACKAGE_ROOT && !subName[packages]) {
          packages = normalizePath(packages + '/');
          if (!subFlag[packages]) {
            errs.push(`preloadRule['${path}'].packages[${i}]: ${packages} not found`);
            continue
          }
        }
      }
      if (errs.length > 0) {
        throw Error(errs.join('\n'));
      }
    }
  }
}

function checkSubPackage(srcPath, appJson) {
  // 名字兼容subPackages/subpackages
  let setting = projectConfig.setting;
  let name = 'subPackages';
  if (appJson.subpackages) {
    name = 'subpackages';
    appJson.subPackages = appJson.subpackages;
    delete appJson.subpackages;
  }
  const pages = appJson.pages || [];
  let flag = false;
  if (appJson.subPackages) {
    if (getType(appJson.subPackages) !== 'array') {
      throw Error('subPackages should be array')
    }
    if (appJson.subPackages.length > setting.MaxSubPackageLimit) {
      throw Error(`subPackages.length must be less than ${setting.MaxSubPackageLimit}`)
    }
    const err = [];
    let pageFlag = {};
    let rootFlag = {};
    appJson.subPackages.forEach((item, index) => {
      pathCheck(item.root, `${name}[${index}].root`)
      if (item.name) {
        if (getType(item.name) !== 'string') {
          err.push(`${name}[${index}].name should be string`)
        }
        if (pageFlag[item.name]) {
          err.push(`${name}-${item.name} already exists`)
        }
        if (item.name === projectConfig.MINI_PROGRAM_MAIN_PACKAGE_ROOT) {
          err.push(`${name}[${index}].name should not be ${projectConfig.MINI_PROGRAM_MAIN_PACKAGE_ROOT}`);
          return;
        }
        pageFlag[item.name] = true;
      }
      item.root = normalizePath(item.root + '/')
      if (rootFlag[item.root]) {
        err.push(`${name}-${item.root} root already exists`);
        return;
      }
      rootFlag[item.root] = true;
      if (!fs.existsSync(path.join(srcPath, item.root))) {
        err.push(`${name}[${index}].root not found`);
        return;
      }
      const fileStat = fs.statSync(path.join(srcPath, item.root));
      if (!fileStat.isDirectory()) {
        err.push(`${name}[${index}].root should be DIRECTORY`);
        return;
      }
      pages.forEach((page, idx) => {
        if (page.indexOf(item.root) === 0) {
          err.push(`main page ${page} should not in subpackage`)
        }
      });
      if (getType(item.pages) !== 'array') {
        err.push(`subPackages.pages should be array`)
      }
      let subPageFlag = {};
      for (let i = 0; i < item.pages.length; i++) {
        const subPage = item.pages[i];
        pathCheck(subPage, `${name}[${index}].pages[${i}]`);
        const subPagePath = normalizePath(`${item.root}/${subPage}`);
        if (subPageFlag[subPagePath]) {
          err.push(`page repeat ${subPagePath}`)
          continue;
        }
        subPageFlag[subPagePath] = true;
        if (!flag && subPagePath == appJson.entryPagePath) {
          flag = true;
        }
        if (!fs.existsSync(path.join(srcPath, `${subPagePath}\.wxml`))) {
          throw Error(`${name} ${subPagePath}\.wxml not exists`);
        }
        if (!fs.existsSync(path.join(srcPath, `${subPagePath}\.js`))) {
          throw Error(`${name} ${subPagePath}\.js not exists`);
        }
      }

    });
    if (err.length > 0) {
      throw Error(err.join('\n'))
    }
    // subpackage 的根目录不能是另外一个 subpackage 内的子目录
    appJson.subPackages.forEach((item, index) => {
      let count = -1;
      const rootpath = '/' + item.root;
      appJson.subPackages.forEach((itm, idx) => {
        if (itm.root && idx !== index) {
          const b = '/' + itm.root;
          if (rootpath.indexOf(b) == 0) {
            count = idx;
          }
        }
      })
      if (count !== -1) {
        err.push(`${name}[${index}].root should not be ${name}[${idx}].root的子目录`);
        return;
      }
    });
    if (err.length > 0) {
      throw Error(err.join('\n'))
    }
  }
  return flag;
}

function checkGameSubpackages(srcPath, gameJson) {
  // 名字兼容subPackages/subpackages
  let setting = projectConfig.setting;
  let name = 'subPackages';
  if (gameJson.subpackages) {
    name = 'subpackages';
    gameJson.subPackages = gameJson.subpackages;
    delete gameJson.subpackages;
  }
  if (gameJson.subPackages) {
    if (getType(gameJson.subPackages) !== 'array') {
      throw Error('subPackages should be array')
    }
    if (gameJson.subPackages.length > setting.MaxSubPackageLimit) {
      throw Error(`subPackages.length must be less than ${setting.MaxSubPackageLimit}`)
    }
    let err = [];
    let pageFlag = {};
    let rootFlag = {};
    gameJson.subPackages.forEach((item, index) => {
      if (item.name) {
        if (getType(item.name) !== 'string') {
          err.push(`${name}[${index}].name should be string`)
        }
        if (pageFlag[item.name]) {
          err.push(`${name}-${item.name} already exists`)
        }
        pageFlag[item.name] = true;
      }
      if (getType(item.root) !== 'string') {
        err.push(`${name}[${index}].root should be string`)
      }
      if (!item.root.startsWith("/")) {
        item.root = normalizePath('/' + item.root)
      }
      if (/\.js$/.test(item.root)) {
        item.root = normalizePath(item.root)
      } else {
        item.root = normalizePath(item.root + '/')
      }
      if (rootFlag[item.root]) {
        err.push(`${name}-${item.root} root already exists`);
        return;
      }
      rootFlag[item.root] = true;
      let rootpath = path.join(srcPath, item.root)
      rootpath = rootpath.replace(/\\/g, '/')
      if (!fs.existsSync(rootpath)) {
        err.push(`${name}[${index}].root not found`);
      } else {
        const status = fs.statSync(rootpath);
        if (status.isDirectory()) {
          if (!/\/$/.test(item.root)) {
            item.root += "/"
          }
          if (!fs.existsSync(path.join(rootpath, "./game.js"))) {
            err.push(`${rootpath}game.js not found`)
          }
        }
      }
    })
    if (err.length > 0) {
      throw Error(err.join('\n'))
    }
  }

}

function pathCheck(param, filePath) {
  if (getType(param) !== 'string') {
    throw Error(`${filePath} should be string`);
  }
  if (0 <= param.indexOf('\\')) {
    throw Error(`${filePath} should not contain \\`);
  }
  if (0 === param.indexOf('.')) {
    throw Error(`${filePath} should not start with .`);
  }
  if (0 === param.indexOf('/')) {
    throw Error(`${filePath} should not start with /`);
  }
}

async function getWeappCodeSize(appconfig, projectInfo) {
  let subPackages, subpkgSize = 0;
  try {
    if (appconfig.subPackages) {
      subPackages = appconfig.subPackages.map((item) => {
        let b = item.root.startsWith('/') ? '' : '/';
        let c = '';
        if (item.root.indexOf('.js') === -1) {
          c = item.root.endsWith('/') ? '' : '/';
        }
        return b + item.root + c
      }).reduce((a, b) => {
        a[b] = 0
        return a
      }, {})
    }
  } catch (err) {}
  let allFiles = projectInfo.fileUtil.getAllFileInfo();
  let totalSize = 0;
  let whiteExtName = appconfig.compileType == 'game' ? projectConfig.gameWhiteFileExtName : projectConfig.whiteFileExtName;
  for (let file in allFiles) {
    let extname = path.extname(file);
    if (whiteExtName[extname]) {
      if (subPackages) {
        const absolutePath = file.startsWith('/') ? file : '/' + file;
        for (const root in subPackages) {
          if (absolutePath.startsWith(root)) {
            subPackages[root] += allFiles[file].size;
            subpkgSize += allFiles[file].size;
            break
          }
        }
      }
      totalSize += allFiles[file].size
    }
  }
  if (subPackages) {
    subPackages.__APP__ = totalSize - subpkgSize
  }
  totalSize = parseInt(totalSize / 1024) + 1;
  if (subPackages) {
    for (const pkg in subPackages) {
      subPackages[pkg] = (subPackages[pkg] / 1024).toFixed(1);
    }
  }
  return {
    total: totalSize,
    subPackages: subPackages
  }
}

function checkWorkers(srcPath, appconfig) {
  const { workers } = appconfig;
  if (workers) {
    pathCheck(workers, 'workers');
    const workersPath = path.join(srcPath, workers);
    if (!fs.existsSync(workersPath)) {
      throw Error('workers directory not exist')
    }
    const status = fs.statSync(workersPath);
    if (!status.isDirectory()) {
      throw Error('workers should be directory')
    }
  }
}

function checkComponentPath(fileUtil, fileContent, filePath) {
  const arr = ['usingComponents', 'componentGenerics'];
  for (const key of arr) {
    const value = fileContent[key] || {};
    const keyArr = Object.keys(value);
    for (const key1 of keyArr) {
      const cfg = 'object' == typeof value[key1] ? value[key1].default : value[key1];
      if (!cfg) continue;
      const relativePath = resolveComponentPath(fileUtil, filePath, cfg);
      if (relativePath) {
        if ('object' == typeof value[key1]) {
          value[key1].default = relativePath
        } else {
          value[key1] = relativePath
        }
      }
    }
  }
}

function resolveComponentPath(fileUtil, filePath, cfg) {
  let dirname = path.posix.dirname(filePath);
  let jsonPath = `${path.posix.join(dirname,cfg)}.json`;
  if (fileUtil.exists(jsonPath)) return;
  let h = path.posix.normalize(dirname);
  for (h = h.split(path.posix.sep), h = h.filter((a) => !!a); h.length && (dirname = path.posix.join(h.join(path.posix.sep), 'miniprogram_npm', cfg), jsonPath = getPath(fileUtil, dirname, cfg), !jsonPath);) h.pop();
  if (!jsonPath) {
    dirname = path.posix.join('miniprogram_npm', cfg)
    jsonPath = getPath(fileUtil, dirname, cfg)
  }
  if (jsonPath) {
    if (/\.json$/.test(jsonPath)) {
      jsonPath = jsonPath.substring(0, jsonPath.length - 5)
    }
    jsonPath = path.posix.relative(path.posix.dirname(filePath), jsonPath)
    return jsonPath;
  }
}

function getPath(fileUtil, dirname, cfg) {
  let jsonPath = `${path.posix.join(dirname,'index')}.json`;
  if (fileUtil.exists(jsonPath)) {
    return jsonPath;
  } else {
    jsonPath = `${path.posix.join(dirname,cfg)}.json`
    if (fileUtil.exists(jsonPath)) {
      return jsonPath;
    } else {
      jsonPath = `${dirname}.json`;
      if (fileUtil.exists(jsonPath)) {
        return jsonPath;
      } else {
        return ''
      }
    }
  }
}

function isHexColor(a) {
  return /^#[a-f\d]{3}$/i.test(a) || /^#[a-f\d]{4}$/i.test(a) || /^#[a-f\d]{6}$/i.test(a) || /^#[a-f\d]{8}$/i.test(a)
}

function requireConfig(srcPath, file) {
  let filePath = path.join(srcPath, file)
  try {
    let content = fs.readFileSync(filePath);
    return JSON.parse(content)
  } catch (err) {
    // throw err
  }
  return
}
module.exports = {
  checkAppJSON,
  checkGameJSON,
  checkIsInSubPackage,
  checkJSONFile: checkPageJSON,
  getExt,
  getCompileConfig,
  getComponentFileList,
  getFileListWithMainPack,
  formatWXSS,
  stripAppconfig,
  normalizePath,
  getWeappCodeSize
}
