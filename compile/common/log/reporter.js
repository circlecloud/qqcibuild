const logger = require("./log");
const os = require("os");
const cpuStat = require("cpu-stat");
const util = require("util");
const axios = require('axios');
const cpuUsagePercent = util.promisify(cpuStat.usagePercent);
const querystring = require("querystring");
const cpuMemReportRate = 60000; //cpu内存统计频率
const platform = 'CI';

class Reporter {
  constructor() {
    this.uin = "";
    this.appid = "";
    this.path = "/"; //若http请求上报，表示接口地址
    this.type = ""; //上报事件类型
    this.log = ""; //具体内容
  }
  setUin(uin) {
    this.uin = uin;
  }
  setAppid(appid) {
    this.appid = appid;
  }

  setPath(path) {
    this.path = path;
  }
  setType(type) {
    this.type = type;
  }

  /**
   *
   * @param {String} type 日志类型：log,http,cpu,memory
   * @param {*} log
   * @param {*} path
   */
  report(type, log = "", path) {
    if (!this.Type[type]) {
      logger.error(`${type}不在Report Type${this.Type}定义的类型中`);
      return;
    }
    this.type = type;
    this.log = log;
    this.path = path;

    function reportBeacon() {
      logger.reporter(...arguments);
      // BeaconAction.onEvent.call(BeaconAction, ...arguments); //上报灯塔
    }

    if (type === this.Type.MEMORY_CPU) {
      let memoryUsage = process.memoryUsage();
      reportBeacon("1", "MEMORY_CPU", {
        ide_uin: this.uin,
        appid: this.appid,
        cpu: log.cpu,
        memory: log.memory,
        heap_total: memoryUsage.heapTotal,
        heap_used: memoryUsage.heapUsed,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      });
    }
    if (type === this.Type.PAGE) {
      reportBeacon("2", "PAGE", {
        ide_uin: this.uin,
        appid: this.appid,
        path: log,
        ide_platform: platform
      });
    }
    if (type === this.Type.IDE_LOGIN) {
      reportBeacon("3", "IDE_LOGIN", {
        ide_uin: this.uin
      });
    }
    if (type === this.Type.IDE_HTTP) {
      let logObj = JSON.parse(log);
      reportBeacon("4", "IDE_HTTP", {
        ide_uin: this.uin,
        appid: this.appid,
        path: path,
        time: logObj.time,
        code: logObj.code === -1 ? -1 : 0,
        interfaceId: logObj.interfaceId
      });
    }
    if (type === this.Type.OPEN_EXTERNAL) {
      reportBeacon("5", "OPEN_EXTERNAL", {
        uin: this.uin,
        appid: this.appid,
        path: path
      });
    }
    if (type === this.Type.IDE_REMOTE) {
      reportBeacon("6", "IDE_REMOTE", {
        ide_uin: this.uin,
        appid: this.appid,
        type: log,
        value: path
      });
    }

    if (type === this.Type.OPEN_EXTERNAL) {
      reportBeacon("7", "OPEN_EXTERNAL", {
        uin: this.uin,
        appid: this.appid,
        path: path
      });
    }
    if (type === this.Type.IDE_ERROR) {
      reportBeacon("8", "IDE_ERROR", {
        ide_uin: this.uin,
        appid: this.appid,
        message: log.msg
      });
    }
    if (type === this.Type.IDE_MUTATION) {
      reportBeacon("9", "IDE_MUTATION", {
        ide_uin: this.uin,
        appid: this.appid,
        path: log
      });
    }
    if (type === this.Type.IDE_JSSDK) {
      let logObj = JSON.parse(log);
      reportBeacon("10", "IDE_JSSDK", {
        ide_uin: this.uin,
        appid: this.appid,
        api: logObj.api,
        ret: logObj.ret,
        errMsg: logObj.errMsg
      });
    }
    if (type === this.Type.IDE_COMPILE) {
      let logObj = JSON.parse(log);
      reportBeacon("11", "IDE_COMPILE", {
        code: logObj.code,
        cost: logObj.cost,
        type: logObj.type,
      });
    }
    if (type === this.Type.IDE_COMPILE_PLUS) {
      let cpu = JSON.stringify(os.cpus());
      let total_mem = os.totalmem();
      let free_mem = os.freemem();
      let os_platform = os.platform();
      let memoryUsage = process.memoryUsage();
      reportBeacon("12", "IDE_COMPILE_PLUS", {
        type: log.type,
        cost: log.cost,
        code: log.code,
        msg: log.msg,
        cpu: cpu,
        os_platform: os_platform,
        total_mem: total_mem,
        free_mem: free_mem,
        file_path: log.file_path,
        file_count: log.file_count,
        heap_total: memoryUsage.heapTotal,
        heap_used: memoryUsage.heapUsed,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      });
    }
  }
  reportMD(opt) {
    //fromId,toId,interfaceId,code,delay
    let data = {
      fromId: opt.fromId || '262000040',
      toId: opt.toId || '262000040',
      interfaceId: opt.interfaceId,
      code: opt.code,
      delay: opt.delay || 0,
      type: opt.type, //0：成功，1:失败，2:逻辑失败
      r: Math.random()
    }
    let url = `https://h5.qzone.qq.com/report/md?fromId=${data.fromId}&toId=${data.toId}&interfaceId=${data.interfaceId}&code=${data.code}&delay=${data.delay}&type=${data.type}&r=${data.r}`
    // console.log('url',url);
    axios.get(url).then(response => {
      // console.log(response.data)
    }).catch(err => {
      // console.log(err);
    })
  }

  /**
 * 上报罗盘 dc05191
 * 查看 http://dc.cp.oa.com/index.php/index/config?menu_id=01-02&rowid=8975
 */
dcreport(opt) {
  opt = opt || {};
  opt.uin = '2557555491';
  opt.LogTime = (new Date()).getTime();
  let url = 'https://h5.qzone.qq.com/report/compass/dc03422?' + querystring.stringify(opt);
  // console.log(opt)
  return axios.get(url).then(response  => { 
    // console.log(opt,response.data)
    return;
  }).catch(err => { 
    // console.log(err);
    return;
  })
  
};

}

//这里相当于自定义事件，有需要 在这里补充，统一管理，方便在罗盘查询
Reporter.prototype.Type = {
  IDE_ERROR: "IDE_ERROR",
  IDE_LOGIN: "IDE_LOGIN",
  MEMORY_CPU: "MEMORY_CPU",
  IDE_HTTP: "IDE_HTTP",
  IDE_REMOTE: "IDE_REMOTE",
  PAGE: "PAGE", //页面进入，项目管理、登录、debugger主页面等
  OPEN_EXTERNAL: "OPEN_EXTERNAL", //用系统默认浏览器打开页面
  IDE_MUTATION: "IDE_MUTATION",
  IDE_JSSDK: "IDE_JSSDK",
  IDE_COMPILE: "IDE_COMPILE",
  IDE_COMPILE_PLUS: "IDE_COMPILE_PLUS", // qcc\qcsc\wcc\wcsc 编译耗时统计 by kingweicai
  //...more
};
const reporter = new Reporter();

async function reportCpuMem() {
  try {
    let cpuPercent = await cpuUsagePercent();
    let totalmem = os.totalmem,
      freemem = os.freemem();
    let memPercent =
      Math.floor(((totalmem - freemem) / totalmem) * 10000) / 100;
    reporter.report(reporter.Type.MEMORY_CPU, {
      cpu: Number(cpuPercent).toFixed(2),
      memory: Number(memPercent).toFixed(2)
    });
  } catch (e) {
    console.error(e);
  }
  setTimeout(reportCpuMem, cpuMemReportRate);
}
reportCpuMem();

module.exports = reporter;
