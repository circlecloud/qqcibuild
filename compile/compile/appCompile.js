const path = require("path");
const fs = require("fs");
const mkdir = require("mkdir-p");
const appConfig = require("./app_config");
const Wxml = require("./wxml");
const Wxss = require("./wxss");
const pageFrame = require("./page_frame");
const appService = require("./appService");
const pages = require("./pages");
const otherFiles = require("./otherFiles");
const workers = require("./workers");
const pack = require("./pack");
const logger = require("../common/logger");
const compileHelper = require("./compileHelper");
// const task = require("../task");
const packageCompile = require("./packageCompile");

module.exports = async function (config) {
  const {
    appid,
    sourceCodePath,
    buildPath,
    debug,
    projectCfg,
    version
  } = config;

  const projectInfo = {
    sourceCodePath,
    appid,
    sourceCodePath,
    buildPath,
    debug,
    projectCfg,
    version,
    inMinifyList:
      [
        /*'101496022', '101490593'*/
      ].indexOf(appid) > -1
  };

  let appconfig = await appConfig(projectInfo); // 生成app-config.json，后续的编译都依赖于这个配置文件
  appconfig.compileType = "app";
  // 统计下编译次数
  let mainCount = 1,
    subCount = 0,
    subPackagesCount = 0;
  if (appconfig.subPackages && appconfig.subPackages.length > 0) {
    subCount = 1;
    subPackagesCount = appconfig.subPackages.length;
  }
  // 获取代码大小
  let sizeInfo = await compileHelper.getWeappCodeSize(appconfig, projectInfo);
  // logger.info(sizeInfo);

  // logger.info(
  //   `compile tasks: ${mainCount} + ${subCount} + ${subPackagesCount} = ${mainCount +
  //   subCount +
  //   subPackagesCount}`
  // );

  let packs = [];
  let flag = false;
  if (flag) {
    // 串行
    try {
      if (
        !appconfig.subPackages ||
        (appconfig.subPackages && appconfig.subPackages.length == 0)
      ) {
        // 无分包模式，编译整包
        packs.push(await compilePackage(projectInfo, appconfig, false));
      } else if (appconfig.subPackages && appconfig.subPackages.length > 0) {
        // 有分包配置，编译分包
        // 编译主包
        let task = await compilePackage(projectInfo, appconfig, true);
        packs.push(task);

        // 编译子包
        for (let i = 0, len = appconfig.subPackages.length; i < len; i++) {
          let task = await compilePackage(
            projectInfo,
            appconfig,
            true,
            appconfig.subPackages[i]
          );
          packs.push(task);
        }
      }
      return { pkgArr: packs, appconfig, sizeInfo };
    } catch (err) {
      let error = new Error(err);
      throw error;
    }
  } else {
    // 并行
    try {
      if (
        !appconfig.subPackages ||
        (appconfig.subPackages && appconfig.subPackages.length == 0)
      ) {
        // 无分包模式，编译整包
        packs.push(await compilePackage(projectInfo, appconfig, false));
      } else if (appconfig.subPackages && appconfig.subPackages.length > 0) {
        // 有分包配置，编译分包
        let list = [];
        // 编译主包
        list.push(compilePackage(projectInfo, appconfig, true));
        // let task = await compilePackage(projectInfo, appconfig, true)
        // packs.push(task)

        // 编译子包
        for (let i = 0, len = appconfig.subPackages.length; i < len; i++) {
          list.push(
            compilePackage(
              projectInfo,
              appconfig,
              true,
              appconfig.subPackages[i]
            )
          );
          // let task = await compilePackage(projectInfo, appconfig, true, appconfig.subPackages[i])
          // packs.push(task)
        }
        packs = await Promise.all(list);
        // console.error(packs);
      }
      return { pkgArr: packs, appconfig, sizeInfo };
    } catch (err) {
      let error = new Error(err);
      throw error;
    }
  }
};

/**
 * 编译
 * @param {object} projectInfo 项目信息
 * @param {object} appconfig 应用配置
 * @param {boolean} isSubPackage 是否为分包模式
 * @param {object} subPackage 如果是分包模式，当前分包的配置
 */
async function compilePackage(
  projectInfo,
  appconfig,
  isSubPackage,
  subPackage
) {
  let _projectInfo = Object.assign({}, projectInfo),
    _appconfig = Object.assign({}, appconfig);

  let start = Date.now();
  let setting = _projectInfo.projectCfg.setting || {};
  setting.compiler = {
    QCCCompile: true,
    QCSCCompile:true
  };
  let pack = await packageCompile(
    _projectInfo,
    _appconfig,
    subPackage,
    setting
  );

  // let pack = await task.runTask({
  //   path: "/packageCompile",
  //   param: {
  //     projectInfo: _projectInfo,
  //     appconfig: _appconfig,
  //     subPackage: subPackage,
  //     setting: setting
  //   }
  // });
  // logger.info(`${pack.name}: run ${Date.now() - start}`);
  return pack;
}

async function compile(projectInfo, appconfig, subPackage) {
  const packName = (projectInfo.packName = !appconfig.subPackages
    ? "__APP__"
    : subPackage
      ? `${subPackage.root}`
      : "__APP__");
  const packPath = (projectInfo.packPath = path.join(
    projectInfo.buildPath,
    packName.replace(/\//g, "_")
  ));
  mkdir.sync(packPath);

  projectInfo.appConfig = appconfig; // appconfig.subPackages存在表示为分包模式
  projectInfo.subPackageConfig = subPackage; // 当前分包配置，为空表示主包，非空表示子包

  let mainPages = appconfig.mainPages;
  delete appconfig.mainPages;

  // 整包或者分包的主包或者独立分包，才需要写入app-config.json
  if (!subPackage || !appconfig.subPackages) {
    fs.writeFileSync(
      path.join(packPath, "app-config.json"),
      JSON.stringify(appconfig)
    );
    // logger.info(`${packName}: generate app-config.json done!`);
    if (appconfig.workers) {
      // 整包或者独立分包的主包才编译workers
      await workers(projectInfo, packPath, appconfig.workers);
    }
  } else if (subPackage && subPackage.independent) {
    let distPath = path.join(packPath, subPackage.root);
    mkdir.sync(distPath);
    fs.writeFileSync(
      path.join(distPath, "app-config.json"),
      JSON.stringify(appconfig)
    );
    // logger.info(`${packName}: generate app-config.json done!`);
  }

  // 主包的pages，编译时只需要主包的page
  if (appconfig.subPackages && !subPackage) {
    appconfig.pages = mainPages;
  }

  const wxml = new Wxml(projectInfo);
  const wxss = new Wxss(projectInfo);

  let pageFrame_start = +new Date();
  await pageFrame(projectInfo, wxml, wxss); // 生成page-frame.html
  // logger.info(
  //   `${packName}: generate page-frame.html done! cost::`,
  //   +new Date() - pageFrame_start
  // );

  let appService_start = +new Date();
  await appService(projectInfo, wxml, wxss); //生成app-service
  // logger.info(
  //   `${packName}: generate app-service done! cost::`,
  //   +new Date() - appService_start
  // );

  let pages_start = +new Date();
  await pages(projectInfo, wxml, wxss); //生成各页面的样式
  // logger.info(
  //   `${packName}: generate pages done! cost::`,
  //   +new Date() - pages_start
  // );

  let otherFiles_start = +new Date();
  await otherFiles(projectInfo); //处理其他文件
  let otherFiles_end = +new Date() - otherFiles_start;
  // logger.info(`${packName}: other files done! cost::`, otherFiles_end);

  let path_start = +new Date();
  let apkgPath = packPath + ".wxapkg";
  let packInfo = await pack({ srcPath: packPath, distPath: apkgPath }); // 打包成.wxapkg
  // logger.info(`${packName}: apkg files done! cost::`, +new Date() - path_start);

  return {
    name: packName,
    size: packInfo.totalSize,
    packPath: apkgPath,
    pkgBuffer: packInfo.data,
    compileTime: {
      aotime: otherFiles_end
    }
  };
}
