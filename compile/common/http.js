// 页面和后端Node不同域名
// mqqserver提供后端Node服务，开发过程中本地127.0.0.1，测试环境10.100.69.74
const request = require("request");
const config = require("./config");
// const store = require("../../stores/vueStores");
// import windowUtil from "@/common/utils/windowUtil";
// const reporter = require("./log/reporter");
const logger = require("./log/log");
const util = require("./utils");

const HostMap = {
  local: "127.0.0.1",
  test: "10.100.69.74",
  prod: "q.qq.com"
  // prod: 'mq.oa.com'
};
const qua = config.qua;

// 本地调试可打开
const isDev = false;
// const isDev = true;
// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

let ifRequestBeforeInit = util.getRandomIntBetween(100000, 999999);

/**
 * @param {*} options
 *                path:不带域名的请求路径,如 /proto1/action2
 *                method:请求方式 get/post
 *                devMode:调试模式  local/test/prod  默认正式环境
 *                headers:请求头
 *                body:post参数
 *                qs:get参数
 *
 */
function handle({
  path,
  method = "get",
  devMode = "prod",
  headers = {},
  body = {},
  qs = {},
  json = true,
  writeStream,
  interfaceId
} = {}) {
  // console.log('headers', headers);
  // 如果没有qq号， 随机生成一个8位数字上报，用于查log，这个随机code还需要提示出来以便查log
  // if (store) {
  //   if (!store.state.user.uin) {
  //     store.state.user.uin = `ide${ifRequestBeforeInit}`;
  //   }
  //   let uin = store.state.user.uin;
  //   headers["x-uin"] = headers["x-uin"] || uin;
  //   headers.traceid = util.generateTraceId(uin);
  // } else {
  // headers["x-uin"] = `ide${ifRequestBeforeInit}`;
  // headers.traceid = util.generateTraceId(ifRequestBeforeInit);
  // }
  if (path.indexOf("ide/") === -1) {
    console.warn(`${path} use old server`);
  }
  // let uin = store.state.user.uin;

  headers.qua = qua;
  headers.host = headers.host || HostMap.prod;

  let uin = `cibuild_${ifRequestBeforeInit}`;
  headers["x-uin"] = headers["x-uin"] || uin;
  headers.traceid = util.generateTraceId(uin);
  const host = HostMap[devMode];
  if (!host) {
    throw new Error("参数错误devMode:" + devMode);
  }

  // 传入的域名不一样也处理下
  let uri;

  if (/^(?:http(?:s)?:)?\/\//.test(path)) {
    uri = path;
    // 要覆盖掉 host, 太智障了...
    // const { host: trueHost } = url.parse(path);
    const matched = path.match(/^(?:http(?:s)?:)?\/\/([^/]+)(\/|$)/);

    if (matched && matched[1]) {
      headers.host = matched[1];
    }
  } else {
    let protocol = host === "q.qq.com" && !isDev ? "https" : "http";
    uri = `${protocol}://${host}${path}`; // q.qq.com用https,mq.oa.com用http
  }

  const requestOptions = {
    uri,
    method,
    headers,
    json,
    // proxy: isDev ? "http://127.0.0.1:8888" : null,
    strictSSL: !isDev
  };

  if (method === "post") {
    Object.assign(requestOptions, {
      body,
      qs
    });
  } else if (method === "get") {
    Object.assign(requestOptions, {
      qs: qs || body
    });
  } else {
    throw new Error(`参数错误method: ${method}`);
  }
  // console.log(requestOptions);
  return new Promise((resolve, reject) => {
    let startTime = Date.now();
    logger.http("req", requestOptions);
    let reqInstance = request(requestOptions, (err, res, resBody) => {
      let endTime = Date.now();
      let time = endTime - startTime;
      if (err) {
        logger.error(err);
        // reporter.report(
        //   reporter.Type.IDE_HTTP,
        //   JSON.stringify({
        //     code: -1,
        //     statusCode: (res || {}).statusCode,
        //     time,
        //     interfaceId
        //   }),
        //   path
        // );
        reject(err);
        return;
      }

      if (!writeStream) {
        // logger.info("res", resBody);

        let { code } = resBody;

        if (typeof code === "object") {
          // 有的是返回res.head，有的返回res.head.toString()
          code = code.low;
        }
        // reporter.report(
        //   reporter.Type.IDE_HTTP,
        //   JSON.stringify({
        //     code: (code + "").length > 10 ? 0 : code, // 有些接口返回的code不是表示成功失败的数值，而是字符串。这里兼容下
        //     time,
        //     interfaceId
        //   }),
        //   path
        // );
        if (code === "-3000") {
          const error = new Error("登陆态失效");
          logger.error(error);
          // store.commit("user/logout");
          // if (location.hash.indexOf("debuggerWin") > -1) {
          //   windowUtil.openLogin();
          // } else {
          //   location.href = "/index.html#/login"; // 项目管理等界面，跳转到登陆界面，引用router会报错，没整明白原因。
          // }
          reject(error);
          return;
        }
        resolve(resBody);
      }
    });

    // 如果是下载流的话, 由流接管 resolve 和 reject
    if (writeStream) {
      reqInstance.on("response", res => {
        console.log("--res--res--res--", res);
        res.pipe(writeStream);
      });

      writeStream.on("error", error => {
        console.log("--error--error--error--", error);
        reject(error);
      });

      writeStream.on("close", () => {
        console.log("--close--close--close--");
        resolve();
      });
    }
  });
}

function get(path, options) {
  let params = Object.assign({}, options, {
    method: "get",
    path: path
  });
  return handle(params);
}

function post(path, options) {
  let params = Object.assign({}, options, {
    method: "post",
    path: path
  });
  // console.log('params', params);
  return handle(params);
}

module.exports = {
  get,
  post,
  HostMap
};
