const path = require("path");
const mkdir = require("mkdir-p");
const compileOther = require("./compileOther");
const compileWXSS = require("./compileWXSS");
const compileJS = require("./compileJS");
const dirMap = require("../common/dirMap");
// import store from "@/stores/vueStores";
const tools = require("../files/tools");
// import task from "../task";

async function preCompile(sourcePath, projectCfg, recordTxt) {
  const compileConfig = {
    compileType: "weapp",
    projectpath: sourcePath,
    projectname: projectCfg.name,
    packOptions: {
      ignoire: []
    },
    setting: {
      autoAudits: false,
      es6: projectCfg.setting.es6,
      minified: projectCfg.setting.minified,
      newFeature: true,
      postcss: projectCfg.setting.postcss,
      urlCheck: projectCfg.setting.urlCheck,
      sourcemapDisabled: projectCfg.setting.sourcemapDisabled
    }
  };
  const buildBasePath = dirMap["QQappdest"];
  const distPath = path.join(buildBasePath, "pre_source_code");
  mkdir.sync(distPath);
  // 编译顺序：JS => wxss => 其他文件，JS和wxss需要编译处理，其他文件直接按对应目录复制，并输出日志

  // console.group("preCompile start");

  // console.groupCollapsed("preCompile js start");
  // console.info("编译JS文件...");
  recordTxt && recordTxt("编译JS文件...");
  let preCompileStart = +new Date();
  try {
    if (projectCfg.projectType === "game") {
      compileConfig.compileType = "game";

      await compileJS(compileConfig, { distPath: distPath }, recordTxt);
      // console.groupEnd();
      // console.info("preCompile js end, cost::", +new Date() - preCompileStart);
      // console.groupCollapsed("编译其他文件...");
      await compileOther(compileConfig, { distPath: distPath }, recordTxt);
      // console.info("preCompile other file end");
      // console.groupEnd();
    } else {
      let { appCodeTmpPath } = await tools.transCodeToCodeTmp({
        project: projectCfg,
        clean: true
      });
      compileConfig.projectpath = appCodeTmpPath;
      await compileJS(compileConfig, { distPath: distPath }, recordTxt);
      // console.groupEnd();
      // console.info("preCompile js end, cost::", +new Date() - preCompileStart);

      // console.groupCollapsed("preCompile wxss start");
      // console.info("编译WXSS文件...");
      recordTxt && recordTxt("编译WXSS文件...");
      let compileWXSS_start = +new Date();
      await compileWXSS(compileConfig, { distPath: distPath }, recordTxt);
      // console.groupEnd();
      // console.info(
      //   "preCompile wxss end,cost:",
      //   +new Date() - compileWXSS_start
      // );

      // console.groupCollapsed("preCompile other file start");
      // console.info("编译其他文件...");
      recordTxt && recordTxt("编译其他文件...");
      let compileOther_start = +new Date();
      // await task.runTask({
      //   path: '/compileOther',
      //   param: {
      //     compileConfig,
      //     distConfig :{
      //       distPath: distPath
      //     },
      //     recordTxt
      //   }
      // })
      await compileOther(compileConfig, { distPath: distPath }, recordTxt);
      // console.groupEnd();
      // console.info(
      //   "preCompile other file end",
      //   +new Date() - compileOther_start
      // );
    }
    // console.info("preCompile end,cost", +new Date() - preCompileStart);
    // console.info(`preCompile distPath: ${distPath}`);
    // console.groupEnd();
    return distPath;
  } catch (err) {
    for (let i = 0; i <= 10; i += 1) {
      // console.groupEnd();
    }
    console.error(err);
    throw err;
  }
}

module.exports = preCompile;
