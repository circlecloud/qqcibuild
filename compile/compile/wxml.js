const path = require("path");
const fs = require("fs");
// const tools = require('../../../src/weapp/utils/tools.js');
const { spawn } = require("child_process");
const compileHelper = require("./compileHelper");
const utils = require("../common/utils");
// const vendorPath = path.join(process.cwd(), 'static/vendor');

const tools = require("../files/tools");
let staticPath = tools.getStaticPath();
const vendorPath = path.join(staticPath, "/vendor");
/**
 * 获取编译wxml所需要的文件
 * @param {object} projectInfo 项目信息
 */
function getFiles(projectInfo) {
  let wxmlFiles = projectInfo.fileUtil.getAllWXMLFiles(),
    wxsFiles = projectInfo.fileUtil.getAllWXSFiles()

  const {
    appConfig,
    subPackageConfig
  } = projectInfo

  // 如果是分包模式
  if (appConfig.subPackages) {
    // 过滤掉分包中文件 找出主包中的文件
    let _wxmlFiles = wxmlFiles.filter(file => {
      let flag = true
      appConfig.subPackages.forEach(config => {
        if (file.indexOf(config.root) === 0) {
          flag = false
        }
      });
      return flag
    }),
      _wxsFiles = wxsFiles.filter(file => {
        let flag = true
        appConfig.subPackages.forEach(config => {
          if (file.indexOf(config.root) === 0) {
            flag = false
          }
        });
        return flag
      })


    if (subPackageConfig) {
      if (subPackageConfig.independent) {
        wxmlFiles = wxmlFiles.filter(file => {
          return file.indexOf(subPackageConfig.root) === 0
        })
        wxsFiles = wxsFiles.filter(file => {
          return file.indexOf(subPackageConfig.root) === 0
        })
      } else { // 如果是非独立分包，需要用主包的文件再加上当前子包的文件
        wxmlFiles = _wxmlFiles.concat(wxmlFiles.filter(file => {
          return file.indexOf(subPackageConfig.root) === 0
        }))
        wxsFiles = _wxsFiles.concat(wxsFiles.filter(file => {
          return file.indexOf(subPackageConfig.root) === 0
        }))
      }
    } else {
      // 否则如果是主包，直接用主包中的文件
      wxmlFiles = _wxmlFiles
      wxsFiles = _wxsFiles
    }
  }

  return {
    wxmlFiles,
    wxsFiles
  }
}

class WXML {
  constructor(projectInfo, setting = {}) {
    this.projectInfo = projectInfo
    this.appcode = null
    this.setting = setting
  }

  generate() {
    let that = this;
    let wxml_start = +new Date;
    const {
      sourceCodePath,
      subPackageConfig,
      packName
    } = this.projectInfo
    let name = '$gwx';
    if (subPackageConfig && !subPackageConfig.independent) {
      name = `$${Buffer.from(subPackageConfig.root).toString('hex')}`
    }

    if (this.appcode) {
      return Promise.resolve({
        code: this.appcode,
        name
      })
    }

    let {
      wxmlFiles,
      wxsFiles
    } = getFiles(this.projectInfo),
      files = wxmlFiles.concat(wxsFiles)

    files = files.map(file => {
      return `./${file}`
    })
    let useQCC = this.setting.compiler.QCCCompile;
    // console.log(`[${__filename}][useQCC]:`, useQCC);
    if (useQCC) {
      const compileConfig = compileHelper.getCompileConfig(this.projectInfo);
      return new Promise((resolve, reject) => {
        let params;
        let flag = ">_<" + Date.now() % 1e4;
        params = []
          .concat(['-d', '-cc', compileConfig.join(flag), '--split', flag])
          .concat(['-gn', name])

        let QCC = require('@tencent/qcc');
        let qccCompileConfig = {};

        qccCompileConfig.cmd = params;
        qccCompileConfig.FILESBASE = sourceCodePath;
        qccCompileConfig.FILES = files;

        QCC(qccCompileConfig).then(function (qccRes) {
          // console.log(`${packName}: wxml generate done! cost::`, +new Date - wxml_start)
          let code = qccRes.code;
          that.appcode = code
          return resolve({
            code,
            name
          });
        }).catch(function (err) {
          console.error(err);
          let err1 = new Error(`3-编译 .wxml 文件错误，错误信息如下，${err.message}`)
          reject(err1)
        });
      });
    } else {
      const compileConfig = compileHelper.getCompileConfig(this.projectInfo);

      return new Promise((resolve, reject) => {
        let params;
        let cmd;
        let flag = ">_<" + Date.now() % 1e4;
        const WXMLParsePath = process.platform === 'darwin' ? path.join(vendorPath, 'wcc') : (process.platform === 'linux' ? path.join(vendorPath, 'wcc.bin') : path.join(vendorPath, 'wcc.exe'));
        cmd = WXMLParsePath;
        params = []
          .concat(['-d', '-cc', compileConfig.join(flag), '--split', flag])
          .concat(files)
          .concat(['-gn', name])
        let shouldUseConfigFile = utils.shouldUseConfigFile(params);
        let tmpConfigFile;
        if (shouldUseConfigFile) {
          let index = sourceCodePath.indexOf('pre_source_code')
          const Weappdest = sourceCodePath.substr(0, index);
          tmpConfigFile = path.join(Weappdest, utils.random());
          fs.writeFileSync(tmpConfigFile, params.join("\n"));
        }
        let wcc = spawn(cmd, shouldUseConfigFile ? ["--config-path", tmpConfigFile] : params, {
          cwd: sourceCodePath
        }),
          stdout = [],
          stderr = []

        wcc.on('error', err => {
          reject(err)
        })

        wcc.on('close', exitcode => {
          // console.error(`${packName}: wxml generate done! cost::`, +new Date - wxml_start)
          if (exitcode === 0) {
            let code = Buffer.concat(stdout).toString()
            this.appcode = code
            return resolve({
              code,
              name
            })
          }
          let errInfo = Buffer.concat(stderr).toString(),
            err = new Error(`3-编译 .wxml 文件错误，错误信息如下，${errInfo}`)
          reject(err)
        })
        wcc.stdout.on('data', data => {
          stdout.push(data)
        })
        wcc.stderr.on('data', data => {
          stderr.push(data)
        })
      })
    }
  }
}

module.exports = WXML
