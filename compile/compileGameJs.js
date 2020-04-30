const path = require("path");
const mkdir = require("mkdir-p");
const compileJS = require("./precompile/compileJS");

async function compile(sourcePath) {
  const compileConfig = {
    compileType: "weapp",
    projectpath: sourcePath,
    projectname: "mini",
    packOptions: {
      ignoire: []
    },
    setting: {
      autoAudits: false,
      es6: true,
      minified: false,
      newFeature: true,
      postcss: false,
      urlCheck: true
    }
  };

  const buildBasePath = nw.App.getStartPath();
  const distPath = path.join(buildBasePath, "pre_source_code");
  mkdir.sync(distPath);

  try {
    await compileJS(compileConfig, {
      distPath: distPath,
      useGameDefine: true
    });
  } catch (err) {
    console.error(err);
  }
}

export default compile;
