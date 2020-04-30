const mkdir = require("mkdir-p");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const fileUtil = require("../files/getProjectFileUtil");
// import locales from "@/weapp/utils/locales/index.js";
const bufUtil = require("../files/bufUtil");
const transformJS = require("./transformJS");
// import eventBus from "@/components/debugger/eventBus";
// import {
//   FILE_NOT_UTF8,
//   BABEL_TRANS_JS_ERR,
//   UGLIFY_JS_ERR,
//   BABILI_JS_ERR
// } from "./error_code";
// const task = require("../task");
bufToUTF8 = bufUtil.bufToUTF8;
const getMD5 = str => {
  let md5 = crypto.createHash("md5");
  return md5.update(str).digest("hex");
};

// 根据用户在项目设置中的设定，对JS文件进行babel转换，压缩，添加sourcemap等处理
const transJS = async config => {
  return new Promise(async (resolve, reject) => {
    try {
      const dataStr = config.code;
      const transConfig = {
        projectPath: config.projectPath,
        file: config.file,
        es6: config.es6 ? "yes" : "no",
        minified: config.minified ? "yes" : "no",
        sourceMaps: "map",
        sourceFileName: path.basename(config.file),
        sourcemapDisabled: config.sourcemapDisabled
      };
      const c = await transformJS(dataStr, transConfig);
      // console.log(1010105, {
      //   path: "/processjs",
      //   param: {
      //     query: transConfig,
      //     headers: { downgrade: "no" },
      //     body: dataStr
      //   }
      // });
      // const c = await task.runTask({
      //   path: "/processjs",
      //   param: {
      //     query: transConfig,
      //     headers: { downgrade: "no" },
      //     body: dataStr
      //   }
      // });
      resolve(c);
    } catch (error) {
      console.error(error);
      error instanceof Error ? reject(error) : reject(new Error(error));
    }
  });
};

const cache = {};

const writeFileTask = async (config, fileObj, recordTxt) => {
  return new Promise(async (resolve, reject) => {
    const {
      srcFilePath,
      fileBuffer,
      destFilePath,
      fileName,
      destPath,
      projectPath
    } = fileObj,
      extname = path.extname(srcFilePath);
    const { es6, minified, sourcemapDisabled } = config.setting;

    recordTxt && recordTxt(`正在编译 ${path.basename(srcFilePath)}`);
    // 判断文件是否UTF8编码，不是的话直接抛出错误
    let jsCode = bufToUTF8(fileBuffer),
      jsMap = "";
    if (jsCode === undefined) {
      // let err = new Error(locales.config.FILE_NOT_UTF8.format(srcFilePath));
      // err.code = FILE_NOT_UTF8;
      // throw err;
    }

    /**
     * 开始处理JS文件
     * 根据文件是否需要es6转换及是否需要压缩，设置缓存，使用原始文件的md5作为校验；如果原始文件没有改动，则不重新转换，直接返回缓存结果即可
     * 举例，有文件为a.js，需要es6转换及压缩，则缓存key为a.js_true_true，下次重新编译的时候，假如通过md5校验a.js没有改变，并且依然需要es6转换及压缩，则直接返回缓存中的数据
     */
    const now = Date.now(),
      md5 = getMD5(jsCode),
      cacheKey = `${srcFilePath}_${es6}_${minified}`;

    const fileCache = cache;

    if (fileCache[cacheKey] && fileCache[cacheKey].md5 === md5) {
      // 这里对比的是原始文件的md5，不是编译后的
      jsCode = fileCache[cacheKey].jsCode;
      jsMap = fileCache[cacheKey].map;
      // console.info("compile js", srcFilePath, "in cache, skip.");
    } else if ((es6 || minified) && 512000 > jsCode.length) {
      try {
        const transCode = await transJS({
          projectPath,
          es6,
          minified,
          sourcemapDisabled,
          file: fileName,
          code: jsCode
        });
        jsCode = transCode.code;
        jsMap = transCode.map;
        // 每次转换完成后，将数据写入缓存中，以备下次使用
        fileCache[cacheKey] = { md5: md5, jsCode: jsCode, map: jsMap };
      } catch (error) {
        console.error(error);
        reject(error);
        return;
      }
    } else {
      // eventBus.emit("consoleDisplay", {
      //   title: "编译提示",
      //   message: `文件${fileName}超过500k，不进行ES5转换或压缩，请自行转换压缩`
      // });
      fileCache[cacheKey] = { md5: md5, jsCode: jsCode, map: jsMap };
    }

    // 将转换后的数据，写入到目的文件中
    const destDir = path.dirname(destFilePath);
    mkdir.sync(destDir);
    if (jsMap !== "") {
      let a = path.join(destPath, `${fileName}.map`);
      fs.writeFileSync(a, jsMap);
    }

    await fs.writeFileSync(destFilePath, jsCode);
    // console.info(`compile js file [${fileName}] done`);
    resolve();
  });
};

module.exports = async (config, distConfig = {}, recordTxt) => {
  const { compileType } = config;
  const { distPath } = distConfig;
  const util = await fileUtil(config);
  // 取出所有JS文件，遍历作转换处理
  let files = util.getAllJSFiles();
  // console.log(files);
  if (compileType == "plugin") {
    files = files.filter(item => {
      if (item.indexOf("doc/") == 0) {
        return false;
      }
      return true;
    });
  }

  const programRoot = "";

  const taskQueue = [];
  files.forEach(async item => {
    const file = util.getFile(item, null);
    // console.log(item);
    taskQueue.push(
      writeFileTask(
          config,
          {
            projectPath: util.srcPath,
            fileBuffer: file,
            srcFilePath: path.join(programRoot, item),
            destFilePath: path.join(distPath, programRoot, item),
            destPath: path.join(distPath, programRoot),
            fileName: item
          },
          recordTxt
        )
    );
  });
  await Promise.all(taskQueue);
};
