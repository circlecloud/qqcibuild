'use strict';
const FileUtil = require('../common/fileUtil')
const { NO_BOM_VAR } = require('../common/projectConfig')
const fs = require('fs')
const path = require('path')
const sourceMap = require("source-map")
const logger = require('../common/logger')
const sourceMapHelper = require('../common/getSourceMap')
const util = require('../common/utils')
let sourceMapGenerator = new sourceMap.SourceMapGenerator({
  file: ''
});
let codeLen = 0;

module.exports = async function (projectInfo, buildPath, workers) {
  let start = +new Date;
  // logger.info('compile workers start....');
  const sourcePath = projectInfo.sourceCodePath;
  let workersBasePath = path.join(sourcePath, workers)
  const fileUtil = new FileUtil(workersBasePath)
  let files = fileUtil.getAllFile();
  let codeArr = [];

  try {
    for (let i = 0; i < files.length; i++) {
      let filename = files[i];
      if (path.extname(filename) !== '.js') {
        continue;
      }
      let code = fileUtil.getFile(filename);
      let jsCode = `define("${workers}/${filename.replace(/\"/g, '\\"')}", function(require, module, exports, ${NO_BOM_VAR}){\n ${code}\n});`;
      codeLen++;
      codeArr.push(jsCode);
      let { len } = await sourceMapHelper.generateSourcemap(path.join(workersBasePath, filename), code, codeLen)
      codeLen += len + 1;
    }
    let workerPath = path.join(buildPath, 'workers.js')
    fs.writeFileSync(workerPath, codeArr.join('\n'));
    let uploadWithSourceMap = projectInfo.projectCfg.setting.uploadWithSourceMap;
    if (uploadWithSourceMap) {
      fs.writeFileSync(`${workerPath}.map`, sourceMapGenerator.toString());
    }
    util.rmdir(workersBasePath, true);
    // logger.info('compile workers end,cost ', +new Date - start);
    return;
  } catch (err) {
    logger.error('compile workers error', err)
    throw err
  }
}
