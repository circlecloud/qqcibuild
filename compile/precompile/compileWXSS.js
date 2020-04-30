const mkdir = require("mkdir-p");
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const autoprefixer = require("autoprefixer");

const fileUtil = require("../files/getProjectFileUtil");
// import locales from "@/weapp/utils/locales/index.js";
const { bufToUTF8 } = require("../files/bufUtil");
const { FILE_NOT_UTF8, POST_WXSS_ERR } = require("./error_code");
const browsers = ["iOS >= 8", "Chrome >= 37"];

const prefix = (a, b) => {
  return typeof a === "string" ? (a.startsWith(b) ? a : b + a) : a;
};

/**
 * 处理WXSS文件，如果用户在项目设置中选择了样式自动补全，则使用postcss对样式进行补全后复制到目的文件夹对应路径，否则直接复制即可
 */
const writeFile = (config, fileObj, recordTxt) => {
  let { srcFilePath, fileBuffer, destFilePath } = fileObj,
    extname = path.extname(srcFilePath),
    needPostcss = config.setting.postcss;
  recordTxt && recordTxt(`正在编译 ${path.basename(srcFilePath)}`);
  // 需要校验是否UTF8编码
  let buf = bufToUTF8(fileBuffer);

  if (buf === undefined) {
    // let err = new Error(locales.config.FILE_NOT_UTF8.format(srcFilePath));
    // throw ((err.code = FILE_NOT_UTF8), err);
  }

  if (needPostcss) {
    try {
      buf = postcss([
        autoprefixer({ browsers: browsers, remove: false })
      ]).process(buf, { from: prefix(srcFilePath, "/") }).css;
    } catch (err) {
      let errRet = new Error(err.message);
      errRet.code = POST_WXSS_ERR;
      errRet.parseError = err.parseError;
      throw errRet;
    }
  }

  const dir = path.dirname(destFilePath);
  mkdir.sync(dir);
  fs.writeFileSync(destFilePath, buf);
  // console.info(`compileQSS file [${path.basename(srcFilePath)}] done.`);
};

module.exports = async (config, distConfig = {}, recordTxt) => {
  const { distPath } = distConfig;

  const util = await fileUtil(config);

  // 取出所有WXSS文件，遍历作转换处理
  const files = util.getAllWXSSFiles();

  const programRoot = "";

  files.forEach(item => {
    const file = util.getFile(item, null);
    writeFile(
      config,
      {
        fileBuffer: file,
        srcFilePath: path.join(programRoot, item),
        destFilePath: path.join(distPath, programRoot, item)
      },
      recordTxt
    );
  });
};
