const fs = require('fs')
const path = require('path')
const glob = require('glob')

class FileUtils {
  constructor(dirPath) {
    this.dirPath = dirPath.replace(/\\/g, '/')

    this._cache = {
      fileList: [],
      fileData: {},
      fileInfo: {},
      existInfo: {}
    }

    this._getAllFile = this._getAllFile.bind(this)
    this.getFilesByExtName = this.getFilesByExtName.bind(this)

    this._getAllFile()
  }

  _getAllFile() {
    let dirPath = this.dirPath
    const ignoreds = [
      'node_modules/**/*',
      '**/node_modules/**',
      '**/.git/**',
      '.git/**/*',
      '**/.svn/**',
      '.svn/**/*',
      '.DS_Store',
      '**/.DS_Store',
      '**/.vscode/**',
      '.vscode/**'
    ]

    try {
      const completeFileList = glob.sync('**', {
        nodir: false,
        ignore: ignoreds,
        nosort: true,
        strict: false,
        silent: true,
        cwd: dirPath,
        absolute: false,
        mark: true,
        dot: true,
      })

      // Though windows uses either / or \ as its path separator, only / characters are used
      this._cache.completeFileList = completeFileList.map(file => {
        let extname = path.extname(file);

        if (extname == '.qml') {
          let newfile = file.replace('.qml', '.wxml');
          fs.renameSync(path.join(dirPath, file), path.join(dirPath, newfile));
          return newfile.replace(/\\/g, path.posix.sep)
        }
        if (extname == '.qss') {
          let newfile = file.replace('.qss', '.wxss');
          fs.renameSync(path.join(dirPath, file), path.join(dirPath, newfile));
          return newfile.replace(/\\/g, path.posix.sep)
        }
        return file.replace(/\\/g, path.posix.sep)
      })

      const fileList = this._cache.completeFileList.filter(file => {
        let stat = fs.lstatSync(path.join(dirPath, file))
        let isFile = stat.isFile()
        if (isFile)
          this._cache.fileInfo[file] = stat
        return isFile
      })


      this._cache.fileList = fileList.filter(file => {
        return file.replace(/\\/g, path.posix.sep)
      })
    } catch (e) {
      throw (e)
    }
  }

  getAllFile(filter = '') {
    if (!filter) {
      return this._cache.fileList
    }

    let res = []
    this._cache.fileList.map(file => {
      if (file.indexOf(filter) == 0) {
        res.push(path.posix.relative(filter, file))
      }
    })
    return res
  }

  getAllFileInfo(filter = '') {
    if (!filter) {
      return this._cache.fileInfo
    }

    let res = {}

    for (let item in this._cache.fileInfo) {
      if (item.indexOf(filter) === 0) {
        res[path.posix.relative(filter, item)] = this._cache.fileInfo[item]
      }
    }

    return res
  }

  getAllFileWithDir(filter = '') {
    if (!filter) {
      return this._cache.completeFileList
    }

    let res = []
    this._cache.completeFileList.map(file => {
      if (file.indexOf(filter) == 0) {
        res.push(path.posix.relative(filter, file))
      }
    })
    return res
  }

  getFilesByExtName(extName = '', filter = '') {
    if (!extName) {
      return this.getAllFile(filter)
    }

    let fileList = this._cache.fileList
    let res = []
    fileList.forEach((file) => {
      let extname = path.extname(file)
      if (extname === extName && file.indexOf(filter) == 0) {
        res.push(path.posix.relative(filter, file))
      }
    })

    return res
  }

  getFile(filePath, encode = 'utf8') {
    let isAbsolute = path.isAbsolute(filePath)
    if (isAbsolute) {
      return
    }

    let cacheKey = encode === null ? 'null' : encode

    filePath = path.posix.join(this.dirPath, filePath.replace(/\\/g, '/'))
    if (this.dirPath.startsWith('//') && !filePath.startsWith('//')) {
      // windows style shared directory
      // leading double slash missed
      filePath = '/' + filePath
    }

    let fileData = this._cache.fileData

    if (!fileData[filePath]) {
      fileData[filePath] = {}
    }

    if (!fileData[filePath][
      [cacheKey]
      ]) {
      fileData[filePath][
        [cacheKey]
        ] = fs.readFileSync(filePath, encode)
    }

    return fileData[filePath][cacheKey]
  }

  exists(filePath) {
    if (!filePath)
      return false

    filePath = path.posix.join(this.dirPath, filePath)
    if (this.dirPath.startsWith('//') && !filePath.startsWith('//')) {
      // windows style shared directory
      // leading double slash missed
      filePath = '/' + filePath
    }
    let cache = this._cache.existInfo;
    if (cache.hasOwnProperty(filePath)) {
      return cache[filePath];
    }
    let rst = fs.existsSync(filePath);
    this._cache.existInfo[filePath] = rst;
    return rst;
  }

  getAllWXMLFiles() {
    return this.getFilesByExtName('.wxml').concat(this.getFilesByExtName('.qqml'))
  }
  getAllWXSFiles() {
    return this.getFilesByExtName('.wxs').concat(this.getFilesByExtName('.qqs'))
  }
  getAllJSFiles() {
    return this.getFilesByExtName('.js')
  }
  getAllWXSSFiles() {
    return this.getFilesByExtName('.wxss').concat(this.getFilesByExtName('.qqss'))
  }
  getAllJSONFiles() {
    return this.getFilesByExtName('.json')
  }
}

module.exports = FileUtils
