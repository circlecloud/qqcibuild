const fs = require("fs")
const path = require("path")
const mergeJS = require("./mergejs")
const mkdirp = require('mkdir-p')

module.exports = async function (projectInfo, wxml, wxss) {
  const merge = new mergeJS(projectInfo, wxml, wxss)
  const { code, sourcemap } = await merge.generate()

  const distPath = path.join(projectInfo.packPath, projectInfo.subPackageConfig ? projectInfo.subPackageConfig.root : '', 'app-service.js')
  mkdirp.sync(path.dirname(distPath))
  fs.writeFileSync(distPath, code);
  let uploadWithSourceMap = projectInfo.projectCfg.setting.uploadWithSourceMap;
  if (sourcemap && uploadWithSourceMap) {
    fs.writeFileSync(`${distPath}.map`, sourcemap);
  }
}
