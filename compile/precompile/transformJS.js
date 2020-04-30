const path = require('path');
const uglify = require('uglify-js');
const babel = require('babel-core');
const babelCodeFrame = require('babel-code-frame');
const sourceMap = require('source-map');
const sourceMapHelper = require('../common/getSourceMap');
const NoStrict = require('babel-plugin-transform-remove-strict-mode');

module.exports = async function (codeStr, config) {
  const {
    projectPath,
    file,
    es6,
    minified,
    sourceMaps,
    sourceFileName,
    uploadWithSourceMap
  } = config;
  try {
    let initSourceMap = sourceMapHelper.getSourceMap(path.join(projectPath, file), codeStr);
    if (es6 && es6.toLowerCase() === 'yes') {
      // 如果需要es6转换，先进行es6转换，再压缩
      // 进行babel转换的时候会生成sourcemap
      try {
        const transObj = babel.transform(codeStr, {
          presets: ['es2015', 'stage-0'],
          babelrc: !1,
          sourceFileName: sourceFileName || file,
          inputSourceMap: initSourceMap,
          sourceMaps: sourceMaps,
          plugins: [NoStrict]
        });
        codeStr = transObj.code;
        initSourceMap = transObj.map;
      } catch (error) {
        console.error(error);
        error.loc = error.loc || {};
        const msg = `file: ${file}\n ${error.message}\n ${babelCodeFrame(codeStr, error.loc.line, 0 < error.loc.column ? error.loc.column : 1)}`;
        throw {
          message: msg,
          code: -1
        };
      }
      // 对转换后的JS代码进行压缩
      if (minified && minified.toLowerCase() === 'yes') {
        const sourceMapCfg = initSourceMap ? {
          content: initSourceMap,
          filename: file,
          includeSources: true
        } : {
          content: null,
          filename: file,
          includeSources: true
        };
        const minifiedRst = uglify.minify(codeStr, {
          toplevel: !0,
          sourceMap: sourceMapCfg
        });
        if (minifiedRst.error) {
          const msg = `file: ${file}\n ${minifiedRst.error.message}\n ${babelCodeFrame(codeStr, minifiedRst.error.line, 0 < minifiedRst.error.col ? minifiedRst.error.col : 1)}`;
          throw {
            message: msg,
            code: -2
          };
        }
        codeStr = minifiedRst.code;
        initSourceMap = minifiedRst.map;
      }
    } else if (minified && minified.toLowerCase() === 'yes') {
      // 如果不需要es6转换，直接处理sourcemap及压缩
      try {
        if (initSourceMap) {
          let sourceMapConsumer = await new sourceMap.SourceMapConsumer(initSourceMap);
          let sourceMapGenerator = new sourceMap.SourceMapGenerator({
            file: file
          });
          sourceMapConsumer.eachMapping(item => {
            if (typeof item.originalLine === 'number' && typeof item.originalColumn === 'number') {
              var obj = {
                generated: {
                  line: item.generatedLine + 1,
                  column: item.generatedColumn
                }
              };
              if (item.source !== null) {
                obj.source = item.source;
                obj.original = {
                  line: item.originalLine,
                  column: item.originalColumn
                }
                if (item.name !== null) {
                  obj.name = item.name
                }
              }
              sourceMapGenerator.addMapping(obj);
            }
          });
          sourceMapConsumer.sources.forEach(function (sourceFile) {
            const sourceRelative = sourceFile;
            if (!sourceMapGenerator._sources.has(sourceRelative)) {
              sourceMapGenerator._sources.add(sourceRelative);
            }
            const content = sourceMapConsumer.sourceContentFor(sourceFile);
            if (content !== null) {
              sourceMapGenerator.setSourceContent(sourceFile, content);
            }
          });
          initSourceMap = sourceMapGenerator.toJSON();
        } else {
          let sourceMapGenerator = new sourceMap.SourceMapGenerator({
            file: file
          });
          let len = codeStr.split('\n').length;
          for (var s = 0; s < len; s++) {
            sourceMapGenerator.addMapping({
              generated: {
                line: s + 2,
                column: 0
              },
              original: {
                line: s + 1,
                column: 0
              },
              source: file
            });
          }
          sourceMapGenerator._sources.add(file);
          sourceMapGenerator.setSourceContent(file, codeStr);
          initSourceMap = sourceMapGenerator.toJSON();
        }
        const transObj = babel.transform(`(function(){\n${codeStr}\n})()`, {
          presets: [
            ['minify']
          ],
          sourceMap: 'map',
          sourceFileName: file,
          inputSourceMap: initSourceMap,
          babelrc: false,
          plugins: [NoStrict]
        });
        codeStr = transObj.code;
        initSourceMap = transObj.map;
      } catch (error) {
        console.error(error);
        error.loc = error.loc || {};
        const msg = `file: ${file}\n ${error.message}\n ${babelCodeFrame(codeStr, error.loc.line, 0 < error.loc.column ? error.loc.column : 1)}`;
        throw {
          message: msg,
          code: -3
        };
      }
    }
    if (!uploadWithSourceMap) {
      initSourceMap = null
    }
    return {
      error: null,
      map: initSourceMap ? (typeof initSourceMap === 'string' ? initSourceMap : JSON.stringify(initSourceMap)) : '',
      code: codeStr
    };
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
}
