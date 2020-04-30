const fs = require('fs');
const path = require('path');
const glob = require('glob');
const mkdir = require('mkdir-p');
const wxmlRemote = require('./wxmlRemote');
const appConfig = require('./app_config');
const FileUtil = require('../common/fileUtil');
const WXAppcode = require('./wxappcode');
const compileHelper = require('./compileHelper');



module.exports = async function prepareRemoteProjectFile(curProject, appCodeTmpPath, remoteDir, remoteTempDir, setting) {
  const fileUtil = new FileUtil(appCodeTmpPath);
  let compileProjectInfo = {
    // sourceCodePath: b,
    sourceCodePath: appCodeTmpPath,
    appid: curProject.appid,
    fileUtil: fileUtil,
    distPath: remoteTempDir,
    debug: curProject.debug,
    projectCfg: curProject,
  };
  let appconfig = await appConfig(compileProjectInfo);
  let _appconfig = Object.assign({}, appconfig);
  compileProjectInfo.appConfig = _appconfig;
  compileProjectInfo.subPackageConfig = null;

  let getjs = async (c) => {
    const jsfilecontent = await getJsFile(curProject, c, {
      noWarnings: !0
    });
    const jsconfig = getJsConfig(path.join(appCodeTmpPath, decodeURI(c)), jsfilecontent, {
      inlineSources: !0
    });
    const jsconfigStr = 'object' == typeof jsconfig ? JSON.stringify(jsconfig) : '';
    return jsconfigStr ? jsfilecontent.replace(/^\/\/[#|@] sourceMappingURL=[\s]*(\S*)[\s]*$/m, `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${new Buffer(jsconfigStr).toString('base64')}`) : jsfilecontent
  };
  let l = 'weapp:///';
  let appjsonFile = path.join(appCodeTmpPath, 'app.json');
  let appjsonContent = fs.readFileSync(appjsonFile, 'utf8');
  // let p = tools.getProjectConfig(curProject);
  let appjson = JSON.parse(appjsonContent);
  if (!appjson.pages)
    throw new Error('no pages defined.');

  let allJsFile = appjson.pages.map((a) => a + '.js'),
    packageFile = [];
  // 取出所有WXSS文件，遍历作转换处理
  const allJsonFiles = fileUtil.getAllJSONFiles();
  for (let c = 0, e = allJsonFiles.length; c < e; c++) {
    const jsonfile = allJsonFiles[c].replace(/\.json$/, '');
    if (path.normalize(jsonfile) != path.normalize('app'))
      try {
        const pagejson = compileHelper.checkJSONFile(compileProjectInfo, jsonfile) || {};
        pagejson && !0 === pagejson.component && packageFile.push(jsonfile)
      } catch (a) {
        console.error(a);
        continue
      }
  }
  const E = [];
  const F = [];
  if (appjson.subPackages) {
    const packageJsFile = [];
    for (const e of appjson.subPackages) {
      if (!e || !e.root || !e.pages)
        continue;
      e.root = e.root.replace(/\\/g, '/');
      e.root = e.root.startsWith('/') ? e.root.slice(1) : e.root;
      e.root = e.root.endsWith('/') ? e.root : e.root + '/';
      const c = e.pages.map((a) => path.posix.join(e.root, a));
      packageJsFile.push(...c.map((a) => a + '.js'));
      let rootFile = packageFile.filter((a) => {
        a.startsWith(e.root);
      });
      let g;
      let funcName = e && e.root ? `$${new Buffer(e.root).toString('hex')}` : '$gwx';
      try {
        // g = await transWxmlToJs({
        //     project:curProject,
        //     type:'cut',
        //     funcName:funcName,
        //     setting: setting
        //   });
        g = await wxmlRemote({
          projectInfo: compileProjectInfo,
          funcName: funcName,
          isPackage: true,
          setting: setting
        });
      } catch (a) {
        throw new Error('transWXMLToJS fail,' + a);
      }
      E.push(g);
      for (const bbb of [...rootFile, ...c]) {
        const cc = bbb;
        const d = cc.replace(/\"/g, '\\"').replace(/`/g, '\\`');
        let e = {};
        try {
          e = compileHelper.checkJSONFile(compileProjectInfo, cc) || {};
        } catch (a) {
          e = {}
        }
        F.push(`
          __wxAppCode__["${d}.wxml"] = ${funcName}("./${d}.wxml")
          __wxAppCode__["${d}.json"] = ${JSON.stringify(e)}
          `);
      }
    }
    allJsFile = [...allJsFile, ...packageJsFile];
  }
  if (0 < packageFile.length) {
    (packageFile = packageFile.map((a) => a + '.js'));
  }
  allJsFile = allJsFile.filter((a) => 0 > packageFile.findIndex((b) => b === a));
  const extraFile = glob.sync('**/*.js', {
    cwd: appCodeTmpPath,
    ignore: [...['node_modules/**/*', '**/node_modules/**', '**/.git/**', '.git/**/*', '**/.svn/**', '.svn/**/*', '.DS_Store', '**/.DS_Store'], 'app.js', ...packageFile, ...allJsFile],
    nocase: !0,
    dot: !0,
    nodir: !0
  });
  let H;
  try {
    H = await getjs('app.js')
  } catch (a) {
    console.log(a);
    throw new Error('getjs app.js fail,' + a)
  }
  let J = [';' + H, ';require("app.js");', `//# sourceURL=${l}app.js\n`].join('\n');
  let K = path.join(remoteDir, 'app.js');
  glob.sync(path.dirname(K));
  fs.writeFileSync(K, J, 'utf-8');
  J = appjsonContent;
  K = path.join(remoteDir, 'app.json');
  mkdir.sync(path.dirname(K));
  fs.writeFileSync(K, J, 'utf-8');
  for (const g of packageFile) {
    const h = path.join(appCodeTmpPath, g);
    if (!fs.existsSync(h))
      throw new Error(g + ' does not exists');
    if (fs.lstatSync(h).isDirectory())
      throw new Error(g + ' is a directory');
    const packageJsonName = g.replace(/\.js$/i, '');
    const packageJsonFile = compileHelper.checkJSONFile(compileProjectInfo, packageJsonName) || {};
    try {
      H = await getjs(encodeURI(g))
    } catch (a) {
      throw new Error('getjs ' + h + ' fail,' + a)
    }
    if (appjson.plugins && packageJsonFile.usingComponents) {
      for (const a in packageJsonFile.usingComponents) {
        packageJsonFile.usingComponents[a] = packageJsonFile.usingComponents[a].replace(/^plugin:\/\/([^\/]*)\/(.*)/, (a, b, c, d, e) => {
          const f = appjson.plugins[b];
          return f ? `plugin://${f.provider}/${c}` : e
        });
      }
    }
    let J = [`;var __wxAppCode__ = __wxAppCode__ || {}; __wxAppCode__["${packageJsonName}.json"] = ${JSON.stringify(packageJsonFile)}; var __wxRoute = "${packageJsonName.replace(/"/g,'\\"')}"; var __wxRouteBegin = true; var __wxAppCurrentFile__ ="${g.replace(/"/g,'\\"')}"; ` + H, `;require("${g.replace(/"/g,'\\"')}");`, `//# sourceURL=${l}${g}\n`].join('\n');
    let K = path.join(remoteDir, g);
    mkdir.sync(path.dirname(K));
    fs.writeFileSync(K, J, 'utf-8');
  }
  for (const g of allJsFile) {
    const h = path.join(appCodeTmpPath, g);
    if (!fs.existsSync(h))
      throw new Error(g + ' does not exists');
    if (fs.lstatSync(h).isDirectory())
      throw new Error(g + ' is a directory');
    const jsonName = g.replace(/\.js$/i, '');
    // j = checkPageJSON(i,curProject,b) || {};
    const jsonFile = compileHelper.checkJSONFile(compileProjectInfo, jsonName) || {};

    try {
      H = await getjs(encodeURI(g));
    } catch (a) {
      throw new Error('getjs ' + h + ' fail,' + a)
    }
    if (appjson.plugins && jsonFile.usingComponents) {
      for (const a in jsonFile.usingComponents) {
        jsonFile.usingComponents[a] = jsonFile.usingComponents[a].replace(/^plugin:\/\/([^\/]*)\/(.*)/, (a, b, c, d, e) => {
          const f = appjson.plugins[b];
          return f ? `plugin://${f.provider}/${c}` : e
        });
      }
    }
    let J = [`;var __wxAppCode__ = __wxAppCode__ || {}; __wxAppCode__["${jsonName}.json"] = ${JSON.stringify(jsonFile)}; var __wxRoute = "${jsonName.replace(/"/g,'\\"')}"; var __wxRouteBegin = true; var __wxAppCurrentFile__ ="${g.replace(/"/g,'\\"')}"; ` + H, `;require("${g.replace(/"/g,'\\"')}");`, `//# sourceURL=${l}${g}\n`].join('\n');
    let K = path.join(remoteDir, g);
    mkdir.sync(path.dirname(K));
    fs.writeFileSync(K, J, 'utf-8');
  }
  for (const g of extraFile) {
    const a = path.join(appCodeTmpPath, g);
    if (!fs.existsSync(a))
      throw new Error(g + ' does not exists');
    if (fs.lstatSync(a).isDirectory())
      throw new Error(g + ' is a directory');
    try {
      H = await getjs(encodeURI(g))
    } catch (b) {
      throw new Error('getjs ' + a + ' fail,' + b)
    }
    let J = [';var __wxAppData = __wxAppData || {}; var __wxRoute; var __wxRouteBegin; var __wxAppCode__ = __wxAppCode__ || {}; var global = global || {}; var __wxAppCurrentFile__; var Component = Component || function() {}; var Behavior = Behavior || function() {}; ' + H, `//# sourceURL=${l}${g}\n`].join('\n');
    let K = path.join(remoteDir, g);
    mkdir.sync(path.dirname(K));
    fs.writeFileSync(K, J, 'utf-8');
  }


  let L;
  try {
    L = await new WXAppcode(compileProjectInfo, null).generate();
    L = Array.isArray(L) ? L : [L];
  } catch (a) {
    console.log(a);
    throw new Error('getWxAppCode fail,' + a)
  }
  K = path.join(remoteTempDir, 'wxappcode.js');
  fs.writeFileSync(K, `;var __wxAppCode__ = __wxAppCode__ || {}; ${[...L,...F].join(';\n;')};\n//# sourceURL=[__wxAppCode__]`, 'utf-8');
  let M;
  try {
    M = await wxmlRemote({
      projectInfo: compileProjectInfo,
      funcName: '$gwx',
      isPackage: false,
      setting: setting
    });
  } catch (a) {
    console.log(a);
    throw new Error('transWXMLToJS fail,' + a)
  }
  // const N = M.code;
  K = path.join(remoteTempDir, 'wxmlxcjs.js');
  fs.writeFileSync(K, `${[M,...E].join(';\n;')}\n//# sourceURL=[__wxmlXCJS__]`, 'utf-8');

  let O = "";
  // try {
  // 	if (appjson.plugins) {
  // 		const b = [];
  // 		for (const c in appjson.plugins) {
  // 			const {
  // 				provider: d,
  // 				version: e
  // 			} = appjson.plugins[c],
  // 			f = await w.getServiceCode(a, {
  // 					pluginId: d,
  // 					version: e
  // 				});
  // 			b.push(`;${f};\n`)
  // 		}
  // 		O = b.join('\n')
  // 	}
  // } catch (a) {
  // 	throw new Error('getWxPluginCode fail,' + a)
  // }
  K = path.join(remoteTempDir, 'wxplugincode.js');
  fs.writeFileSync(K, `${O}\n//# sourceURL=[__wxPluginCode__]`, 'utf-8')
  if (appjson.cloud) {
    //目前版本尚未支持云函数
    // try {
    //   const a = await A.getAlphaFile('WACloud.js');
    //   fs.writeFileSync(d.join(h, 'wacloud.js'), `${a}\n//# sourceURL=[__WACloud__]`, 'utf8')
    // } catch (a) {
    //   console.error(a)
    // }
  }
  return ['app.json', ...extraFile, 'app.js', ...packageFile, ...allJsFile];
}

async function getJsFile(currentProject, realPathName, c = {}) {
  const babel = require('babel-core');
  const noBrowser = ['window', 'document', 'frames', 'self', 'location', 'navigator', 'localStorage', 'history', 'Caches', 'screen', 'alert', 'confirm', 'prompt', 'XMLHttpRequest', 'WebSocket '];
  let filename = realPathName.replace(/^\//, '');
  let projectSetting = currentProject.setting;
  // let appConfig = tools.getProjectConfig(currentProject);

  let b = currentProject.miniprogramRoot ? path.join(currentProject.path, currentProject.miniprogramRoot) : currentProject.path;
  let localPath = path.join(b, realPathName);
  // 用户脚本
  return new Promise((resolve) => {
    fs.readFile(localPath, 'utf8', function (error, fileContent) {
      if (error) {
        resolve('');
      }

      try {
        if (projectSetting.es6) {
          fileContent = babel.transform(fileContent, {
            presets: ['es2015', 'stage-0'],
            babelrc: false,
            sourceMaps: 'inline',
            sourceFileName: '\/' + realPathName
          }).code || '';
        }
      } catch (error) {
        resolve('');
      }

      let content = 'define("' + filename + '", function(require, module, exports, ' + noBrowser.join(',') + '){' + fileContent + '\n});';

      // let checkname = realPathName.replace(/^\/appservice\//, '');

      // if (appConfig && appConfig.workers && checkname.startsWith(appConfig.workers)) {
      //   content = "__workersCode__['" + checkname + "'] = " + JSON.stringify(content);
      // }
      resolve(content);
    });
  })
}

function getJsConfig(c, d, e) {
  let f;
  try {
    d || (d = a.readFileSync(c, 'utf-8'));
    const e = /\/\/[#|@] sourceMappingURL=[\s]*(\S*)[\s]*$/m.exec(d),
      g = b.dirname(c),
      h = b.basename(c);
    if (!(e && e[1])) {
      const c = b.join(g, `${h}.map`);
      a.existsSync(c) && (f = a.readFileSync(c, 'utf-8'), f = JSON.parse(f))
    } else if (/\.js\.map$/.test(e[1])) f = a.readFileSync(b.join(g, e[1]), 'utf-8'), f = JSON.parse(f);
    else {
      const a = e[1].split('base64,')[1];
      f = Buffer.from(a, 'base64').toString(), f = JSON.parse(f)
    }
  } catch (a) {
    f = void 0
  }
  if (e && e.inlineSources && 'object' == typeof f && Array.isArray(f.sources) && !Array.isArray(f.sourcesContent)) {
    const d = f.sourcesContent;
    try {
      const d = b.dirname(c),
        e = [],
        g = f.sources;
      for (const c of g) {
        const f = a.readFileSync(b.join(d, c), 'utf-8');
        e.push(f)
      }
      f.sourcesContent = e
    } catch (a) {
      f.sourcesContent = d, console.warn('get sourcesContent fail')
    }
  }
  return f
}
