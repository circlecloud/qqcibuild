const path = require('path')
const fs = require('fs')
const mkdir = require('mkdir-p')
const FileUtil = require('../common/fileUtil')
const sourceMap = require("source-map")
const pack = require("./pack")
const logger = require('../common/logger');
const compileHelper = require('./compileHelper');
const workers = require('./workers');
const sourceMapHelper = require('../common/getSourceMap')
const utils = require('../common/utils')
const config = require('../common/projectConfig')
const babel = require("babel-core");

module.exports = async function (config) {
  const {
    appid,
    sourceCodePath,
    buildPath,
    debug,
    version,
    projectCfg,
    remoteModelUseBabel
  } = config

  const fileUtil = new FileUtil(sourceCodePath)
  const projectInfo = {
    appid,
    fileUtil,
    sourceCodePath,
    buildPath,
    debug,
    uploadWithSourceMap: projectCfg.setting.uploadWithSourceMap,
    remoteModelUseBabel
  }

  let gameconfig = compileHelper.checkGameJSON(projectInfo);
  gameconfig.compileType = 'game';
  gameconfig.debug = false;
  if (debug == undefined) { // 预览包强制true
    gameconfig.debug = true;
  }
  gameconfig.PackageToolVersion = version;
  if (gameconfig.subpackages) {
    gameconfig.subPackages = gameconfig.subpackages;
    delete gameconfig.subpackages;
  }
  // 统计下编译次数
  let mainCount = 1,
    subCount = 0,
    subPackagesCount = 0
  if (gameconfig.subPackages && gameconfig.subPackages.length > 0) {
    subCount = 1
    subPackagesCount = gameconfig.subPackages.length
  }

  // 获取代码大小
  let sizeInfo = await compileHelper.getWeappCodeSize(gameconfig, projectInfo);
  // logger.error(sizeInfo);

  // logger.error(`compile tasks: ${mainCount} + ${subCount} + ${subPackagesCount} = ${mainCount + subCount + subPackagesCount}`)

  let packs = []
  try {
    if (subPackagesCount === 0) { // 无分包模式，编译整包
      packs = await compilePackage(projectInfo, gameconfig, false)
    } else if (subPackagesCount > 0) { // 有分包配置，编译分包
      packs = await compilePackage(projectInfo, gameconfig, true)
    }

  } catch (err) {
    err.ret = -1
    throw err
  }
  return {
    pkgArr: packs,
    appconfig: gameconfig,
    sizeInfo
  }
}

/**
 * 编译
 * @param {object} projectInfo 项目信息
 * @param {object} gameconfig 应用配置
 * @param {boolean} isSubPackage 是否为分包模式
 */
async function compilePackage(projectInfo, gameconfig, isSubPackage) {
  mkdir.sync(projectInfo.buildPath);
  let packs = [];
  if (!isSubPackage) {
    // const packName = '__APP__';
    // const destPath = path.join(projectInfo.buildPath, packName)
    // if (gameconfig.workers) {
    //   await workers(projectInfo.sourceCodePath, destPath, gameconfig.workers);
    // }
    // await mergeJS(projectInfo);
    // handleOtherfile(projectInfo.fileUtil, destPath);
    // packs.push(await compile(projectInfo.sourceCodePath, projectInfo.buildPath, packName))
    let pack = await compileMainPkg(projectInfo, gameconfig); //await compile(projectInfo.sourceCodePath, projectInfo.buildPath, "__APP__");
    packs.push(pack)
    return packs;
  } else {
    // 先把分包打包好，文件都移到分包目录后将剩下的文件打成主包
    let subPackages = gameconfig.subPackages;
    for (let i = 0; i < subPackages.length; i++) {
      let item = subPackages[i];
      const packName = item.name;
      if (item.root.indexOf('/') > -1) {
        item.root = item.root.substr(1);
      }
      if (item.root && path.extname(item.root) == '.js') { // 单个js文件
        let startCode = `define("${item.root}", function(require, module, exports){`;
        let endCode = `});  require("${item.root}");`
        let destDir = '';
        let rstCode = [startCode];
        const subPath = path.join(projectInfo.buildPath, packName)

        let sourcePath = path.join(projectInfo.sourceCodePath, item.root);
        const destPath = path.join(subPath, item.root);
        let dirPath = path.dirname(item.root)
        mkdir.sync(path.join(subPath, dirPath));
        let sourceCode = projectInfo.fileUtil.getFile(item.root);
        rstCode.push(sourceCode)
        rstCode.push(endCode);
        rstCode = rstCode.join('\n')
        fs.writeFileSync(destPath, rstCode);
        let sourcemapPath = `${sourcePath}.map`;
        if (!projectInfo.uploadWithSourceMap && fs.existsSync(sourcemapPath)) {
          let {
            sourceMapStr
          } = sourceMapHelper.generateSourcemap(sourcePath, rstCode, 1)
          fs.writeFileSync(sourcemapPath, sourceMapStr);
        }
        let pack = await compile(subPath, projectInfo.buildPath, packName)
        packs.push(pack)
        try {
          utils.rmdir(sourcePath, false);
        } catch (err) {
          console.error(err)
        }
      } else { // 文件夹
        let destDirPath = path.join(projectInfo.buildPath, packName, item.root);
        let sourcePath = path.join(projectInfo.sourceCodePath, item.root);
        mkdir.sync(destDirPath);
        const fileUtil = new FileUtil(sourcePath)

        await mergeJS(fileUtil, destDirPath, item.root, 'game', 'game.js', projectInfo.uploadWithSourceMap, projectInfo.remoteModelUseBabel)
        // let sourcePath = path.join(projectInfo.sourceCodePath, item.root);
        // const fileUtil = new FileUtil(sourcePath)
        // const jsFiles = fileUtil.getAllJSFiles();
        // let rstCode = [];
        // let codeLen = 0;
        // let sourceMapGenerator = new sourceMap.SourceMapGenerator({
        //   file: ''
        // })
        // for (let i = 0; i < jsFiles.length; i++) {
        //   let filename = jsFiles[i];
        //   let tempPath = path.join(item.root, filename);
        //   let startCode = `define("${tempPath}", function(require, module, exports){`;
        //   let endCode = `});`
        //   if (filename == 'game.js') {
        //     endCode += `  require("${tempPath}");`
        //   }
        //   let tempCode = fileUtil.getFile(filename);

        //   rstCode.push(startCode);
        //   rstCode.push(tempCode)
        //   rstCode.push(endCode)
        //   codeLen++;
        //   let { len } = await sourceMapHelper.generateSourcemap(path.join(projectInfo.sourceCodePath, tempPath), tempCode, codeLen, sourceMapGenerator);
        //   codeLen += len + 1;
        // }
        // rstCode = rstCode.join('\n');
        // fs.writeFileSync(`${srcPath}/game.js`, rstCode);
        // fs.writeFileSync(`${srcPath}/game.js.map`, sourceMapGenerator.toString())
        handleOtherfile(fileUtil, destDirPath, gameconfig);
        try {
          utils.rmdir(sourcePath, true);
        } catch (err) {
          console.error(err)
        }
        let pack = await compile(path.join(projectInfo.buildPath, packName), projectInfo.buildPath, packName);
        packs.push(pack)
        try {
          utils.rmdir(sourcePath, true);
        } catch (err) {
          console.error(err)
        }
      }
      // logger.error(`${packName}: apkg files done!`)
    }
    // 剩下的文件打成主包
    let pack = await compileMainPkg(projectInfo, gameconfig); //await compile(projectInfo.sourceCodePath, projectInfo.buildPath, "__APP__");
    packs.push(pack)
  }
  return packs
}

async function compile(srcPath, packPath, name) {
  const apkgPath = `${packPath}/${name}.wxapkg`
  let packInfo = await pack({
    srcPath: srcPath,
    distPath: apkgPath
  })
  return {
    name: name,
    size: packInfo.totalSize,
    packPath: apkgPath,
    pkgBuffer: packInfo.data
  }
}

async function compileMainPkg(projectInfo, gameconfig) {
  const packName = '__APP__';
  const destPath = path.join(projectInfo.buildPath, packName)
  mkdir.sync(destPath);
  // 编译workers
  if (gameconfig.workers) {
    let sourcePath = path.join(projectInfo.sourceCodePath, gameconfig.workers);
    const fileUtil = new FileUtil(sourcePath)
    await mergeJS(fileUtil, destPath, gameconfig.workers, 'workers', '', projectInfo.uploadWithSourceMap);
  }
  // 编译openDataContext
  if (gameconfig.openDataContext) {
    let sourcePath = path.join(projectInfo.sourceCodePath, gameconfig.openDataContext);
    const fileUtil = new FileUtil(sourcePath);
    await mergeJS(fileUtil, destPath, gameconfig.openDataContext, 'subContext', 'index.js', projectInfo.uploadWithSourceMap); // fileUtil, buildPath, rootPath, filename, entryFile
  }
  const fileUtil = new FileUtil(projectInfo.sourceCodePath)
  await mergeJS(fileUtil, destPath, '', 'game', 'game.js', projectInfo.uploadWithSourceMap, projectInfo.remoteModelUseBabel);
  handleOtherfile(fileUtil, destPath, gameconfig)
  let pack = await compile(destPath, projectInfo.buildPath, packName);
  // logger.error(`${packName}: apkg files done!`);
  return pack
}

async function mergeJS(fileUtil, buildPath, rootPath, filename, entryFile, uploadWithSourceMap, remoteModelUseBabel) {
  const jsFiles = fileUtil.getAllJSFiles();
  let sourcePath = fileUtil.dirPath;
  let rstCode = [];
  let codeLen = 0;
  let sourceMapGenerator = new sourceMap.SourceMapGenerator({
    file: ''
  })
  let entryCodeArr = [];
  let entryCode;
  for (let i = 0; i < jsFiles.length; i++) {
    let filename = jsFiles[i];
    let tempPath = path.join(rootPath, filename);
    tempPath = tempPath.replace(/\\/g, '/');
    let startCode = `define("${tempPath}", function(require, module, exports){`;
    let endCode = `});`
    let tempCode = fileUtil.getFile(filename);
    if (filename == entryFile) {
      entryCode = tempCode;
      endCode += `  require("${tempPath}");`
      entryCodeArr.push(startCode);
      entryCodeArr.push(tempCode)
      entryCodeArr.push(endCode)
    } else {
      rstCode.push(startCode);
      rstCode.push(tempCode)
      rstCode.push(endCode)
      codeLen++;
      let {
        len
      } = await sourceMapHelper.generateSourcemap(path.join(sourcePath, filename), tempCode, codeLen, sourceMapGenerator);
      codeLen += len + 1;
    }
  }
  if (entryCode) {
    codeLen++;
    let {
      len
    } = await sourceMapHelper.generateSourcemap(path.join(sourcePath, entryFile), entryCode, codeLen, sourceMapGenerator);
    codeLen += len + 1;
    rstCode = rstCode.concat(entryCodeArr)
  }
  rstCode = rstCode.join('\n');
  if (remoteModelUseBabel) {
    // 小游戏真机调试上传才会有这个，要给源码插入打点
    try {
      rstCode = babel.transform(rstCode, {
        compact: true,
        plugins: [path.join(process.cwd(), './static/compile/babel.js')]
      }).code;
    } catch (error) {
      logger.error(error);
    }
  }
  fs.writeFileSync(`${buildPath}/${filename}.js`, rstCode);
  if (uploadWithSourceMap) {
    fs.writeFileSync(`${buildPath}/${filename}.js.map`, sourceMapGenerator.toString())
  }
  jsFiles.forEach(item => {
    try {
      utils.rmdir(path.join(sourcePath, item), false);
    } catch (err) {
      console.error(err)
    }
  })
}

async function handleOtherfile(fileUtil, buildPath, gameconfig) {
  const excludeExt = {
    ".js": true,
    ".map": true
  }

  const files = fileUtil.getAllFile()

  files.forEach(item => {
    const extname = path.extname(item)

    if (!excludeExt[extname] && config.gameWhiteFileExtName[extname]) {
      let file = fileUtil.getFile(item, null);
      if (item == 'game.json') {
        try {
          file = JSON.parse(file);
          file.PackageToolVersion = gameconfig.PackageToolVersion;
          file = JSON.stringify(file)
        } catch (err) {
          console.error(err)
          throw Error(`game.josn jsonparse error`)
        }
      }
      let destPath = path.join(buildPath, item)
      const dir = path.dirname(destPath)
      mkdir.sync(dir)
      fs.writeFileSync(destPath, file)
    }
  })
}
