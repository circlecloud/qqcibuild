const path = require("path");
const getFileUtil = require("./getFileUtil");
const commonUtilTools = require("../common/tools");
const mkdir = require("mkdir-p");
const util = require("util");
const fs = require("fs");
const xmlConvert = require("../common/xml2js/index");
const fsWriteFilePromise = util.promisify(fs.writeFile);
const fsReadFilePromise = util.promisify(fs.readFile);
function normalizePath(filePath) {
  const normalPath = path.posix.normalize(filePath.replace(/\\/g, "/"));
  if (
    (filePath.startsWith("//") || filePath.startsWith("\\\\")) &&
    !normalPath.startsWith("//")
  ) {
    return "/" + normalPath;
  } else {
    return normalPath;
  }
}
function getStaticPath() {
  const rootPath = __dirname; // nw.App.getStartPath();
  return path.resolve(rootPath, "../..");
}
async function getAllFileList(filepath) {
  const fileUtil = await getFileUtil(filepath);
  let files = fileUtil.getAllFile();
  files = files.map(el => "./" + el);
  return files;
}
/**
 * 不建议外部直接用这个路径，因为有可能代码不复制到这里，还是留着用户代码目录
 * 建议直接用transCodeToCodeTmp返回的appCodeTmpPath
 * @param {*} project
 */
function getAppCodeTmpPath(project) {
  let projectId = project.id;
  // let uin = store.state.user.uin || "anonymous";
  let uin = "260035891";
  const homePath = path.join(
    process.env.USERPROFILE || "~",
    `AppData/Local/${global.userDirName}/User Data/Default`
  );
  return path.join(homePath, `../QQappCodeTmp/${uin}/${projectId}`);
}
function cleanAppCodeTmp(project) {
  let tmpPath = getAppCodeTmpPath(project);
  commonUtilTools.rmSync(tmpPath);
}
async function transCodeToCodeTmp({ project, fileList, clean = false }) {
  const utf8Ext = {
    ".js": true,
    ".wxss": true,
    ".wxml": true,
    ".wxs": true,
    ".qss": true,
    ".qml": true,
    ".qs": true,
    ".json": true
  };
  let projectRoot = project.miniprogramRoot
    ? path.join(project.path, project.miniprogramRoot)
    : project.path;
  let appCodePath = projectRoot;
  if (!fileList) {
    fileList = await getAllFileList(projectRoot);
  }
  // 判断一下有没有qq后缀的，没有的话就不用处理了，优化一下速度
  let needTrans = fileList.find(el => {
    return el.search(/\.(qml|qss|qs)$/) !== -1;
  });

  if (!needTrans) {
    return {
      destList: fileList,
      appCodeTmpPath: projectRoot,
      hasTrans: false
    };
  }

  let appCodeTmpPath = getAppCodeTmpPath(project);

  // window是fileUtil的watch时间触发有延迟。会导致写入文件后立即读到文件列表不全，这里做一下兼容。
  let fileUtil = await getFileUtil(appCodeTmpPath, {
    lazyInit: true,
    noWatch: true
  });
  // fileUtil.stopWatch();

  if (clean) {
    cleanAppCodeTmp(project);
  }

  // 如果有qq**,就忽略wx**
  let tmpfileList = fileList.filter(el => {
    if (el.search(/\.(wxml|wxss|wxs)$/) !== -1) {
      let fakeName = el
        .replace(/\.wxml$/, ".qml")
        .replace(/\.wxss$/, ".qss")
        .replace(/\.wxs$/, ".qs");
      if (fileList.includes(fakeName)) {
        return false;
      }
    }
    return true;
  });

  let destList = tmpfileList.map(function(el) {
    return el
      .replace(/\.qml$/, ".wxml")
      .replace(/\.qs$/, ".wxs")
      .replace(/\.qss$/, ".wxss");
  });

  // 拷贝文件 && 修改文件内容
  for (let i = 0; i < tmpfileList.length; i++) {
    let src = path.join(appCodePath, tmpfileList[i]);
    let dest = path.join(appCodeTmpPath, destList[i]);
    let destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      mkdir.sync(destDir);
    }
    let ext = path.extname(src);
    let content;
    if (utf8Ext[ext]) {
      content = await fsReadFilePromise(src, "utf8");
    } else {
      content = await fsReadFilePromise(src);
    }

    if (ext === ".qml") {
      content = transQmlToWxml(content);
    } else if (ext === ".qs") {
      content = transQsToWxs(content);
    } else if (ext === ".qss") {
      content = transQssToWxss(content);
    }

    await fsWriteFilePromise(dest, content);
  }

  fileUtil.setAllFileListCache(destList);
  // fileUtil.startWatch();
  return {
    destList,
    appCodeTmpPath,
    hasTrans: true
  };
}
function transQsToWxs(content) {
  // 把require引入路径全部替换掉

  const REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
  content = content.replace(REQUIRE_RE, function(m, m1, m2) {
    if (m2) {
      return m.replace(m2, m2.replace(".qs", ".wxs"));
    }

    return m;
  });

  return content;
}

function transQmlToWxml(content) {
  function changeAttr(node) {
    if (node.attributes) {
      // 引入路径全部替换掉
      if (node.attributes.src) {
        node.attributes.src = node.attributes.src
          .replace(".qs", ".wxs")
          .replace(".qml", ".wxml");
      }

      // 把属性值里面wx:** 替换长qq:**
      for (let key in node.attributes) {
        if (key.indexOf("qq:") === 0) {
          node.attributes[key.replace("qq:", "wx:")] = node.attributes[key];
          delete node.attributes[key];
        }
      }

      // 改标签名字
      if (node.name === "qs") {
        node.name = "wxs";
      }
    }

    if (node.elements) {
      for (let i = 0; i < node.elements.length; i++) {
        changeAttr(node.elements[i]);
      }
    }
  }

  try {
    let root = xmlConvert.xml2js(`<root>${content}</root>`, {
      compact: false,
      strict: false,
      sanitize: false,
      allowSurrogateChars: true
    });
    changeAttr(root);
    // console.log("[tools.js]", root);
    content = (
      xmlConvert.js2xml(root, {
        compact: false,
        spaces: "\t",
        fullTagEmptyElement: true,
        captureSpacesBetweenElements: true
      }) || ""
    )
      .replace(/^<root>/, "")
      .replace(/<\/root>$/, "")
      .replace(/^\t/gm, "")
      .trim();
    // console.log("[tools.js]", content);
  } catch (err) {
    console.error(err);
  }

  return content;
}

function transQssToWxss(content) {
  // 把import引入路径全部替换掉
  const IMPORT_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*import|(?:^|[^$])\bimport\s*(["'])(.+?)\1/g;

  content = content.replace(IMPORT_RE, function(m, m1, m2) {
    if (m2) {
      return m.replace(m2, m2.replace(".qss", ".wxss"));
    }

    return m;
  });

  return content;
}
module.exports = {
  normalizePath,
  getStaticPath,
  transCodeToCodeTmp
};
