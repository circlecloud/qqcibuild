/**
 * 获取sourcemap
 */
"use strict"
const fs = require("fs");
const path = require("path");
const sourceMap = require("source-map");

function getSourceMap(filepath, codestr, sourcemapInput) {
  let sourcemapObj;
  try {
    codestr || (codestr = fs.readFileSync(filepath, "utf-8"))
    const mapstr = /\/\/[#|@] sourceMappingURL=[\s]*(\S*)[\s]*$/.exec(codestr);
    const dir = path.dirname(filepath);
    const filename = path.basename(filepath)
    if (!(mapstr && mapstr[1])) {
      const sourcemapPath = path.join(dir, `${filename}.map`);
      if (fs.existsSync(sourcemapPath)) {
        sourcemapObj = fs.readFileSync(sourcemapPath, "utf-8");
        sourcemapObj = JSON.parse(sourcemapObj)
      }
    } else if (/\.js\.map$/.test(mapstr[1])) {
      sourcemapObj = fs.readFileSync(path.join(dir, mapstr[1]), "utf-8");
      sourcemapObj = JSON.parse(sourcemapObj);
    } else {
      let a = mapstr[1].split("base64,");
      if (a && a[1]) {
        a = a[1]
        sourcemapObj = Buffer.from(a, "base64").toString();
        sourcemapObj = JSON.parse(sourcemapObj);
      } else {
        const sourcemapPath = path.join(dir, `${filename}.map`);
        if (fs.existsSync(sourcemapPath)) {
          sourcemapObj = fs.readFileSync(sourcemapPath, "utf-8");
          sourcemapObj = JSON.parse(sourcemapObj)
        }
      }
    }
  } catch (error) {
    console.error(error)
    sourcemapObj = void 0
  }
  if (sourcemapInput && sourcemapInput.inlineSources && "object" == typeof sourcemapObj && Array.isArray(sourcemapObj.sources) && !Array.isArray(sourcemapObj.sourcesContent)) {
    const sourceContent = sourcemapObj.sourcesContent;
    try {
      const dirname = path.dirname(filepath);
      const sourcesContent = [];
      constsources = sourcemapObj.sources;
      for (const key of sources) {
        const sourcepath = fs.readFileSync(path.join(dirname, key), "utf-8");
        sourcesContent.push(sourcepath);
      }
      sourcemapObj.sourcesContent = sourcesContent;
    } catch (error) {
      sourcemapObj.sourcesContent = sourceContent;
      console.warn("get sourcesContent fail");
    }
  }
  return sourcemapObj
}

async function generateSourcemap(filePath, codeStr, codeLen, sourceMapGenerator) {
  if (!sourceMapGenerator) {
    sourceMapGenerator = new sourceMap.SourceMapGenerator({
      file: ''
    })
  }

  let initSourceMap = getSourceMap(filePath);
  let fileName = path.basename(filePath);
  if (initSourceMap) {
    sourceMap.SourceMapConsumer.initialize({
      "lib/mappings.wasm": "https://qzonestyle.gtimg.cn/qzone/qzact/act/external/devtool/mappings.wasm"
    });
    let sourceMapConsumer = await new sourceMap.SourceMapConsumer(initSourceMap);

    // let sourceMapConsumer = new sourceMap.SourceMapConsumer(initSourceMap);
    sourceMapGenerator.setSourceContent(fileName, initSourceMap.sourcesContent[0]);
    sourceMapConsumer.eachMapping((mapping) => {
      if (typeof mapping.originalLine !== 'number' ||
        typeof mapping.originalColumn !== 'number') {
        return
      }
      sourceMapGenerator.addMapping({
        generated: {
          line: codeLen + mapping.generatedLine,
          column: mapping.generatedColumn
        },
        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn
        },
        source: fileName,
        name: mapping.name
      })
    })
    return {
      len: codeStr.split('\n').length,
      sourceMapStr: sourceMapGenerator.toString()
    }
  } else {
    sourceMapGenerator.setSourceContent(fileName, codeStr);
    let len = codeStr.split('\n').length;
    for (let a = 1; a <= len; a++) {
      sourceMapGenerator.addMapping({
        generated: {
          line: codeLen + a,
          column: 0
        },
        original: {
          line: a,
          column: 0
        },
        source: fileName
      })
    }
    return {
      len: len,
      sourceMapStr: sourceMapGenerator.toString()
    }
  }
}

module.exports = {
  getSourceMap,
  generateSourcemap
}
