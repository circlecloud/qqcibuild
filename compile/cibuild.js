const path = require("path"),
    fs = require("fs"),
    upload = require("./compile/upload"),
    md5 = require('md5'),
    configUtil = require("./common/configUtil"),
    error_code = require("./conf/error_code")
    QRCode = require("qrcode"),
    events = require('events'),
    dirMap = require("./common/dirMap"),
    NpmBuild = require("./npmbuild/index"),
    miniappcompile = require("@tencent/miniappcompile");

const { preCompile, compile } = miniappcompile;
const event = new events.EventEmitter();
const CICODE = error_code.CICODE;
const buildBasePath = dirMap["QQappdest"];
const precompilePath = path.join(buildBasePath, "pre_source_code");
const compilePath = path.join(buildBasePath, "rst_code");

function getPathname(projectCfg) {
  let pathname = '';
  let conditionObj = projectCfg.condiction;
  if (conditionObj) {
    const type = projectCfg.projectType === 'app' ? 'weapp' : 'game';
    const condition = conditionObj[type];
    if (
      condition &&
      condition.list &&
      condition.list.length > 0 &&
      condition.current > -1
    ) {
      const compileObj = condition.list[condition.current];
      if (compileObj) {
        pathname = compileObj.pathName || '';
        const query = compileObj.query;
        if (query) {
          pathname = `${pathname}?${query}`;
        }
      }
    }
  }
  return pathname;
}

async function uploadProject({
  projectpath,
  version,
  desc,
  appToken,
  buildUser,
  firstPage,
  experience = false,
  ifRemoteDebug = false,
  roomId,
  dealBuildError,
  reportParams,
  npmBuild
}) {
  let projectCfg = addProject(projectpath);
  if (!projectCfg) { // 获取小程序项目信息失败
    dealBuildError('', CICODE.getConfigError, 'getConfigError', 1, reportParams);
    return;
  }
  
  const miniprogramRoot = projectCfg.miniprogramRoot? path.join(projectCfg.path, projectCfg.miniprogramRoot): projectCfg.path;
  const appid = projectCfg.appid;
  if (npmBuild === true || npmBuild === 'true') {
    let res = await NpmBuild(miniprogramRoot, projectCfg);
    if (!res[0]) {
      dealBuildError(projectCfg.appid, CICODE.npmBuildError, res[1], 1, reportParams);
      return;
    }
  }
  preCompile({ ...projectCfg, outPath: precompilePath, sourceCodePath: miniprogramRoot }).then(
    prePath => {
      compile({
        appid,
        sourceCodePath: prePath,
        outPath: compilePath,
        // projectCfg,
        type: ifRemoteDebug ? 'remoteDebug' : ''//代表真机调试的编译，用于自动化测试时，如果是真机调试，需要把自动化测试的代码打包进小程序
      }).then(
        data => {
          // console.error("===compile total cost===", +new Date() - start);
          let pkgArr = data.pkgArr;
          if (pkgArr && pkgArr.length > 0) {
            let params = {
              appid: appid,
              appToken: appToken,
              appconfig: data.appconfig,
            };
            let type = 0;
            if (ifRemoteDebug === true) {
              let pathname = getPathname(projectCfg);
              type = 6;
              params = {
                type: type,
                roomId: roomId,
                path: pathname,
                ...params,
                skipDomain: projectCfg.setting.urlCheck
              }
            } else {
              type = (experience === true || experience === "true") ? 1 : 0;
              params = {
                version: version,
                intro: desc,
                buildUser: buildUser,
                experience: experience,
                type: type,
                ...params,
              }
              if (firstPage) { 
                params.path = firstPage;
              }
            }
            upload(pkgArr, params).then(
              data => {
                if (data && data.link) {
                  try {
                    var opts = {
                      errorCorrectionLevel: 'H',
                      type: 'image/png',
                      rendererOpts: {
                        quality: 0.3
                      }
                    }

                    let typename = type === 6 ? '真机调试版' : (type === 1 ? '体验版' : '开发版' );
                    
                    console.log('手Q打开' + typename + '：' + data.link);
                    QRCode.toDataURL(data.link, opts, function (err, url) {
                      if (err) {
                        console.error('get qr url error');
                        dealBuildError(appid, CICODE.qrcodeError, '2:' + 'get qr url error', 1, reportParams);
                      } else {
                        url = url.split(",")[1];
                        let name = path.join(projectpath, 'qrcode.png');
                        let buffer = Buffer.from(url, "base64")
                        fs.writeFileSync(name, buffer);
                        let imgmd5 = md5(buffer);
                        
                        if (type === 6) {
                          event.emit("autotest_remotebug_return", {
                            qrCode: url,
                            qrUrl: data.link
                          });
                        } else {
                          dealBuildError(appid, CICODE.success, '', 0, reportParams, { link: data.link, qrcodePath:name,base64: url,md5: imgmd5 });
                        }
                      }
                    })

                  } catch (err) {
                    console.log('qrcode create err', err)
                    dealBuildError(appid, CICODE.qrcodeError, '3:' + err.message, 1, reportParams);
                  }
                } else {
                  console.error("upload error", data);
                  dealBuildError(appid, CICODE.uploadError, '4:' + "upload error", 1, reportParams);
                }
              }
            ).catch(err => {
              console.error("upload error", err);
              dealBuildError(appid, CICODE.uploadError, '5:' + err.message, 1, reportParams);
            });
          } else {
            dealBuildError(appid, CICODE.compileError, '6:' + "compile error", 1, reportParams);
          }
        }
      ).catch(err => {

        console.error("compile error", err);
        dealBuildError(appid, CICODE.compileError, '7:' + err.message, 1, reportParams);
      });
    }
  ).catch(err => {
    console.error("precompile error", err);
    dealBuildError(appid, CICODE.preCompileError, '8:' + err.message, 1, reportParams);
  });
}

function addProject(filePath) {
  const configInfo = configUtil.getConfigFileInfo({
    projectpath: filePath
  });
  let compileType, miniprogramRoot, scripts;
  //先判断有没有project.config.json，有的话从这里取，没有的话通过含app.json还是game.json判断
  if (!configInfo.error) {
    compileType = configInfo.config.compileType;
    miniprogramRoot = configInfo.config.miniprogramRoot || null;
    scripts = configInfo.config.scripts || {};
  } else {
    let dirFiles = [];
    try {
      dirFiles = fs.readdirSync(filePath);
      if ("darwin" === process.platform) {
        dirFiles = dirFiles.filter(a => {
          return 0 !== a.indexOf(".");
        });
      }
      if (
        0 !== dirFiles.length &&
        0 > dirFiles.indexOf("app.json") &&
        0 > dirFiles.indexOf("project.config.json") &&
        0 > dirFiles.indexOf("game.json")
      ) {
        return;
      }
    } catch (a) {
      return;
    }
    if (dirFiles.indexOf("game.json") > -1) {
      compileType = "game";
    } else {
      compileType = "weapp";
    }
  }
  let name = configInfo.config.projectname;
  let appid = configInfo.config.qqappid || configInfo.config.appid;
  let params = {
    path: filePath,
    projectpath: filePath,
    name: name,
    appid: appid,
    template: "",
    miniprogramRoot: miniprogramRoot,
    scripts: scripts,
    projectType: compileType,
    lastVisitTime: +new Date(),
    compileType: compileType, // app: 小程序; game: 小游戏
    setting: configInfo.config.setting,
    condition:configInfo.config.condiction
  };
  let projectinfo = addProjectConfig({
    project: params
  });
  
  global.projectinfoglobal = projectinfo;
  return projectinfo;
}

function createCondiction() {
  return {
    weapp: {
      current: -1,
      list: []
    },
    search: {
      current: -1,
      list: []
    },
    conversation: {
      current: -1,
      list: []
    },
    plugin: {
      current: -1,
      list: []
    },
    game: {
      list: []
    }
  };
}

function addProjectConfig({  project, appInfo = {} }) {
  let { domain = {}} = appInfo;

  let isGame = project.compileType === "game";
  project.projectType = project.compileType === "weapp" ? "app" : "game";
  project.attr = {
    network: !domain
      ? Object.assign({}, initNetwork)
      : {
        RequestDomain: domain.requestDomain || [],
        WsRequestDomain: domain.socketDomain || [],
        UploadDomain: domain.uploadFileDomain || [],
        DownloadDomain: domain.downloadFileDomain || [],
        BizDomain: [] // @todo 这个哪里配置的？
      },
    gameApp: isGame
  };
  project.condiction = project.condition || createCondiction();

  return project;
}

module.exports = uploadProject;