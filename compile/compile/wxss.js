const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const compileHelper = require("./compileHelper");
const utils = require("../common/utils");
// const vendorPath = path.join(process.cwd(), 'static/vendor');
const tools = require("../files/tools");
let staticPath = tools.getStaticPath();
const vendorPath = path.join(staticPath, "/vendor");
function getFiles(projectInfo) {
  const { appConfig, subPackageConfig } = projectInfo
  let wxssFiles = projectInfo.fileUtil.getAllWXSSFiles()

  // 如果是分包模式
  if (appConfig.subPackages) {
    // 抽离出主包的文件，过滤掉子包的文件
    let _wxssFiles = wxssFiles.filter(file => {
      let flag = true
      appConfig.subPackages.forEach(config => {
        if (file.indexOf(config.root) === 0) {
          flag = false
        }
      })
      return flag
    })


    if (subPackageConfig) {
      wxssFiles = _wxssFiles.concat(wxssFiles.filter(file => {
        return file.indexOf(subPackageConfig.root) === 0
      }))
    } else {
      // 如果是主包，只返回主包文件
      wxssFiles = _wxssFiles
    }
  }

  return wxssFiles
}

class WXSS {
  constructor(projectInfo, setting = { compiler: {} }) {
    this.projectInfo = projectInfo
    this.wxsscode = null
    this.setting = setting
  }

  filter(page) {
    if (page == 'comm') return this.wxsscode.comm
    return this.wxsscode[`./${page}.wxss`]
  }

  generate(page = 'comm') {
    let wxss_start = +new Date;
    if (this.wxsscode) {
      return Promise.resolve(this.filter(page))
    }

    const { sourceCodePath, appConfig, subPackageConfig, packName } = this.projectInfo
    const wxssFiles = getFiles(this.projectInfo)
    let pages
    if (subPackageConfig) {
      pages = subPackageConfig.pages
    } else {
      // 整包或主包
      pages = appConfig.pages
    }

    let compileFiles = [],
      flag = {},
      filecount = 0

    wxssFiles.forEach(file => {
      flag[file] = true
    })

    pages.forEach(page => {
      if (flag[`${page}.wxss`]) {
        filecount++
        compileFiles.push(`./${page}.wxss`)
        delete flag[`${page}.wxss`]
      }
    })

    // 增加componentWxss
    let componentWxss = compileHelper.getComponentFileList(this.projectInfo, appConfig, subPackageConfig)
    componentWxss.forEach((filename) => {
      if (flag[`${filename}.wxss`]) {
        filecount++
        compileFiles.push(`./${filename}.wxss`)
        delete flag[`${filename}.wxss`]
      }
    })

    for (let file in flag) {
      compileFiles.push(`./${file}`)
    }

    // qcsc 开关
    let useQCSC = this.setting.compiler.QCSCCompile;
    // console.log(`[${__filename}][useQCSC]:`, useQCSC);
    if (useQCSC) {
      let that = this;
      return new Promise((resolve, reject) => {
        // https://git.code.oa.com/QQMiniApp/qcsc
        let QCSC = require('@tencent/qcsc').QCSC;
        let compileConfig = {};
        compileConfig.cmd = ["-om", "-db", "-pc", filecount];
        if (subPackageConfig) {
          compileConfig.cmd.push('--subpackage');
          compileConfig.cmd.push(subPackageConfig.root.replace(/\/$/, ""));
        }
        compileConfig.FILES = compileFiles;
        compileConfig.FILESBASE = sourceCodePath;
        const qcsc = new QCSC(compileConfig);
        qcsc.compile().then((map) => {
          that.wxsscode = map
          return resolve(that.wxsscode[page]);
        }).catch((err) => {
          console.error(err);
          reject(new Error("编译 .qss 文件错误，错误信息如下：" + err.message));
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        let params;
        let cmd;
        const WXSSParsePath = process.platform === 'darwin' ? path.join(vendorPath, 'wcsc') : (process.platform === 'linux' ? path.join(vendorPath, 'wcsc.bin') : path.join(vendorPath, 'wcsc.exe'));
        cmd = WXSSParsePath;
        params = ['-db', '-pc', filecount + ''].concat(compileFiles);
        if (subPackageConfig) {
          params.push('--subpackage')
          params.push(subPackageConfig.root.replace(/\/$/, ""))
        }
        let shouldUseConfigFile = utils.shouldUseConfigFile(params);
        let tmpConfigFile;
        if (shouldUseConfigFile) {
          let index = sourceCodePath.indexOf('pre_source_code')
          const Weappdest = sourceCodePath.substr(0, index);
          tmpConfigFile = path.join(Weappdest, utils.random());
          fs.writeFileSync(tmpConfigFile, params.join("\n"));
        }

        let wxss = spawn(cmd, shouldUseConfigFile ? ["--config-path", tmpConfigFile] : params, { cwd: sourceCodePath }),
          stdout = [],
          stderr = []

        wxss.on('error', err => {
          reject(err)
        })

        wxss.on('close', exitcode => {
          // console.error(`${packName}: wxss generate done! cost::`, +new Date - wxss_start)
          if (exitcode === 0) {
            let output = Buffer.concat(stdout).toString(),
              arr = output.split('='),
              result = {}

            for (var i = 0, len = arr.length; i < len && arr[i + 1]; i += 2) {
              result[arr[i]] = arr[i + 1]
            }

            this.wxsscode = result
            return resolve(this.wxsscode[page])
          }
          let errInfo = Buffer.concat(stderr).toString(),
            err = new Error(`编译 .qss 文件错误，错误信息如下，${errInfo}`)
          reject(err)
        })
        wxss.stdout.on('data', data => {
          stdout.push(data)
        })
        wxss.stderr.on('data', data => {
          stderr.push(data)
        })
      })
    }


  }
}

module.exports = WXSS
