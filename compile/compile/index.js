const fs = require("fs");
const path = require("path");
const appCompile = require("./appCompile");
const gameCompile = require("./gameCompile");
const dirMap = require("../common/dirMap");
const mkdir = require("mkdir-p");
const projectConfig = require("../common/projectConfig");
// const task = require("../task");

module.exports = async function(config) {
  const { sourceCodePath } = config;
  const buildBasePath = dirMap["QQappdest"];
  const distPath = path.join(buildBasePath, "rst_code");
  let compileType;
  mkdir.sync(distPath);
  config.buildPath = distPath;
  let compileRst;
  const setting = projectConfig.setting;
  // console.log("setting", setting);
  // const pkg = nw.App.manifest;

  // config.version = pkg.version;
  config.version = "0.1.11";
  if (fs.existsSync(`${sourceCodePath}/game.json`)) {
    compileType = "game";
    // try {
    //   compileRst = await task.runTask({
    //     path: "/gameCompile",
    //     param: {
    //       config: config
    //     }
    //   });
    // } catch (err) {
    //   throw new Error(err);
    // }

    compileRst = await gameCompile(config);
  } else {
    compileType = "app";
    // compileRst = await task.runTask({
    //     path: '/appCompile',
    //     param: {
    //      config: config
    //     }
    // })
    compileRst = await appCompile(config);
  }
  // 包大小检查
  // 小程序每个分包不能超过2M，分包数不能超过100，所有分包不超过24M，整包大小不超过2M
  // 小游戏主包不超过4M，其他分包不超过6M，所有分包不超过10M，整包大小不超过4M
  if (compileRst && compileRst.sizeInfo) {
    let sizeInfo = compileRst.sizeInfo;
    if (compileType == "app") {
      if (sizeInfo.subPackages) {
        if (sizeInfo.total > setting.MaxSubpackageFullCodeSize * 1024) {
          throw new Error(
            `代码包大小为${(sizeInfo.total / 1024).toFixed(1)}M，上限为${
              setting.MaxSubpackageFullCodeSize
            }M，请删除后重试`
          );
        }
        let subsubPackages = sizeInfo.subPackages;

        for (let name in subsubPackages) {
          if (subsubPackages[name] > setting.MaxSubpackageSubCodeSize * 1024) {
            throw new Error(
              `分包：${name}大小为${(subsubPackages[name] / 1024).toFixed(
                1
              )}M，上限为${setting.MaxSubpackageSubCodeSize}M，请删除后重试`
            );
          }
        }
      } else {
        if (sizeInfo.total > setting.MaxCodeSize * 1024) {
          throw new Error(
            `代码包大小为${(sizeInfo.total / 1024).toFixed(1)}M，上限为${
              setting.MaxCodeSize
            }M，请删除后重试`
          );
        }
      }
    } else if (compileType == "game") {
      if (sizeInfo.subPackages) {
        if (sizeInfo.total > setting.MaxGameSubpackageFullCodeSize * 1024) {
          throw new Error(
            `代码包大小为${(sizeInfo.total / 1024).toFixed(1)}M，上限为${
              setting.MaxGameSubpackageFullCodeSize
            }M，请删除后重试`
          );
        }
        let subsubPackages = sizeInfo.subPackages;
        for (let name in subsubPackages) {
          let limit;
          if (name == "__APP__") {
            limit = setting.MaxGameMainPkgCodeSize;
          } else {
            limit = setting.MaxGameSubpackageSubCodeSize;
          }
          if (subsubPackages[name] > limit * 1024) {
            throw new Error(
              `分包：${name}大小为${(subsubPackages[name] / 1024).toFixed(
                1
              )}M，上限为${limit}M，请删除后重试`
            );
          }
        }
      } else {
        if (sizeInfo.total > setting.MaxGameMainPkgCodeSize * 1024) {
          throw new Error(
            `代码包大小为${(sizeInfo.total / 1024).toFixed(1)}M，上限为${
              setting.MaxGameMainPkgCodeSize
            }M，请删除后重试`
          );
        }
      }
    }
  }
  return compileRst;
};
