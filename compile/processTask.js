const transformJS = require('./precompile/transformJS.js')
const compileOther = require('./precompile/compileOther')
const gameCompile = require('./compile/gameCompile')
const packageCompile = require('./compile/packageCompile')
const prepareRemoteProjectFile = require('./compile/remoteDebug')

module.exports = async function processTask(pathName, param) {
  switch (pathName.toLowerCase()) {
    case '/processjs': {
      return await transformJS(param.body, param.query)
    }
    case '/compileother': {
      return await compileOther(param.compileConfig, param.distConfig)
    }
    case '/gamecompile': {
      return await gameCompile(param.config)
    }
    case '/packagecompile': {
      return await packageCompile(param.projectInfo, param.appconfig, param.subPackage, param.setting)
    }
    case '/remotedebug': {
      return await prepareRemoteProjectFile(param.curProject, param.appCodeTmpPath, param.remoteDir, param.remoteTempDir, param.setting)
    }

    default: {
      return {
        error: {
          message: 'invalid request'
        }
      }
    }
  }
}
