const path = require('path');
const fs = require('fs');
const {
  spawn
} = require('child_process');
const compileHelper = require('./compileHelper');
const utils = require('../common/utils');
const vendorPath = path.join(process.cwd(), 'static/vendor');

module.exports = async function wxmlRemote(opt) {
  let funcName = opt.funcName || "$gwx";
  let isPackage = opt.isPackage || false;
  let projectInfo = opt.projectInfo;
  const {
    sourceCodePath
  } = projectInfo


  let wxmlFiles = projectInfo.fileUtil.getAllWXMLFiles();
  let wxsFiles = projectInfo.fileUtil.getAllWXSFiles();

  let files = wxmlFiles.concat(wxsFiles);

  files = files.map(file => {
    return `./${file}`
  })

  let useQCC = opt.setting.compiler.QCCCompile;
  console.log(`[${__filename}][useQCC]:`, useQCC);

  if (useQCC) {
    return new Promise((resolve, reject) => {
      let params;
      let flag = ">_<" + Date.now() % 1e4;
      let componentConfigParam = "0";
      if (!isPackage) {
        let componentConfig = compileHelper.getCompileConfig(projectInfo);
        componentConfigParam = componentConfig.join(flag);
      }
      params = []
        .concat(['-d', '-xc', componentConfigParam, '--split', flag])
        .concat(['-gn', funcName]);

      let QCC = require('@tencent/qcc');
      let qccCompileConfig = {};

      qccCompileConfig.cmd = params;
      qccCompileConfig.FILESBASE = sourceCodePath;
      qccCompileConfig.FILES = files;
      QCC(qccCompileConfig).then(function (qccRes) {
        let code = qccRes.code;
        return resolve(code);
      }).catch(function (err) {
        console.error(err);
        let err1 = new Error(`4-编译 .wxml 文件错误，错误信息如下，${err.message}`)
        reject(err1)
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      let params;
      let cmd;
      let flag = ">_<" + Date.now() % 1e4;

      let componentConfigParam = "0";
      if (!isPackage) {
        let componentConfig = compileHelper.getCompileConfig(projectInfo);
        componentConfigParam = componentConfig.join(flag);
      }

      const WXMLParsePath = process.platform === 'darwin' ? path.join(vendorPath, 'wcc') : (process.platform === 'linux' ? path.join(vendorPath, 'wcc.bin') : path.join(vendorPath, 'wcc.exe'));
      cmd = WXMLParsePath;
      params = []
        .concat(['-d', '-xc', componentConfigParam, '--split', flag])
        .concat(files)
        .concat(['-gn', funcName]);
      let shouldUseConfigFile = utils.shouldUseConfigFile(params);
      let tmpConfigFile;
      if (shouldUseConfigFile) {
        const Weappdest = sourceCodePath;
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
        if (shouldUseConfigFile) {
          fs.unlinkSync(tmpConfigFile);
        }
        if (exitcode === 0) {
          let code = Buffer.concat(stdout).toString();
          return resolve(code);
        }
        let errInfo = Buffer.concat(stderr).toString(),
          err = new Error(`4-编译 .wxml 文件错误，错误信息如下，${errInfo}`)
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
