'use strict';
const path = require('path');
const b = require('./d62fc37d7aa6416d5dcc240ba94175cd.js');
class FileUtils {
  constructor(b, c) {
    this.projectPath = b.dirPath,
      this.srcPath = c.replace(/\\/g, '/') || this.projectPath,
      this.relativePath = `${path.posix.relative(this.projectPath, this.srcPath)}`,
      this._excludePath = '',
      this.relativePath && (this.relativePath += '/'),
      this.watcher = b,
      this._handles = []
  }
  set excludePath(b) {
    b ? (this._excludePath = path.posix.relative(this.projectPath, b), this._excludePath && (this._excludePath += '/')) : this._excludePath = ''
  }
  get excludePath() {
    return this._excludePath
  }
  exclude(a) {
    return this.excludePath ? a.filter((a) => {
      return 0 !== a.indexOf(this.excludePath)
    }) : a
  }
  getAllFile() {
    return this.exclude(this.watcher.getAllFile(this.relativePath))
  }
  getAllWXMLFiles() {
    return this.exclude(this.watcher.getFilesByExtName('.wxml', this.relativePath))
  }
  getAllWXSFiles() {
    return this.exclude(this.watcher.getFilesByExtName('.wxs', this.relativePath))
  }
  getAllJSFiles() {
    return this.exclude(this.watcher.getFilesByExtName('.js', this.relativePath))
  }
  getAllWXSSFiles() {
    return this.exclude(this.watcher.getFilesByExtName('.wxss', this.relativePath))
  }
  getAllJSONFiles() {
    return this.exclude(this.watcher.getFilesByExtName('.json', this.relativePath))
  }
  getAllTargetTypeFilesWithOtherTypeFilesOfSameName(a, b) {
    if (!a) return [];
    const c = this.exclude(this.watcher.getFilesByExtName(`.$ {
                a
            }`, this.relativePath));
    if (!b) return c;
    const d = b.map((a) => new Set(this.exclude(this.watcher.getFilesByExtName(`.$ {
                a
            }`, this.relativePath)).map((b) => b.slice(0, -(a.length + 1)))));
    return c.map((b) => b.slice(0, -(a.length + 1))).filter((a) => d.every((b) => b.has(a))).map((b) => b += `.$ {
                a
            }`)
  }
  getAllFileInfo() {
    let a = this.watcher.getAllFileInfo(this.relativePath);
    if (!this.excludePath) return a;
    let b = {};
    for (let c in a) 0 !== c.indexOf(this.excludePath) && (b[c] = a[c]);
    return b
  }
  getAllFileWithDir() {
    return this.exclude(this.watcher.getAllFileWithDir(this.relativePath))
  }
  exists(b) {
    return this.excludePath && 0 == b.indexOf(this.excludePath) ? !1 : this.watcher.exists(a.posix.join(this.relativePath, b))
  }
  getFile(b, c = 'utf8') {
    return this.watcher.getFile(a.posix.join(this.relativePath, b), c)
  }
  watch(a) {
    this._handles.push(a),
      this._lazyWatch()
  }
  unWatch(a) {
    this._handles = this._handles.filter((b) => b != a)
  }
  _lazyWatch() {
    this._lazyWatched || (this.watcher.on('all', (b, c, d) => {
      0 == c.indexOf(this.srcPath) && this._handles.forEach((e) => {
        e(b, a.posix.relative(this.srcPath, c), d)
      })
    }), this._lazyWatched = !0)
  }
}
let d = {};
global.projectFileUtils = d;
module.exports = async function(a, e, f) {
  let g = d[e];
  if (!g) {
    let f = await b(a);
    g = d[e] = new c(f, e)
  }
  if (g.excludePath != f) {
    g.excludePath = f
  }
  return g
}
