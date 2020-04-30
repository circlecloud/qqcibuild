// 参见 js\6242f55dbdfe53c2f07b7a51568311f2.js

const localFileUrlPrefixMap = require("./fileUrlPrefixConfig");
const appVersion = global.appVersion;
const {
  USER_DATA_PATH,
  TMP_DATA_PATH,
  STORE_DATA_PATH
} = localFileUrlPrefixMap;
const weappUsrFileReqular = new RegExp(`^${USER_DATA_PATH}`);
const weappTmpFileReqular = new RegExp(`^${TMP_DATA_PATH}`);
const weappStoreFileReqular = new RegExp(`^${STORE_DATA_PATH}`);
let platform = process.platform;
if (platform === "darwin") {
  platform = "mac";
}
// const agent = navigator.userAgent.toLowerCase();
// if (/macintosh|mac os x/i.test(navigator.userAgent)) {
//   platform = "mac";
// }

// if (agent.indexOf("win32") >= 0 || agent.indexOf("wow32") >= 0) {
//   platform = "win32";
// }
// if (agent.indexOf("win64") >= 0 || agent.indexOf("wow64") >= 0) {
//   platform = "win64";
// }

let version;
try {
  version = nw.App.manifest.version;
} catch (err) {
  version = "0.0.1";
}
const qua = `V1_HT5_QDT_${version}_0_DEV_D`;

module.exports = {
  qua: qua,
  version: version,
  platform,
  qua: qua,
  size: {
    default: {
      width: 1500,
      height: 1100
    },
    project_create: {
      width: 408,
      height: 576
    },
    project_manage: {
      width: 624,
      height: 518
    },
    setting: {
      width: 560,
      height: 360
    },
    login: {
      width: 334,
      height: 520
    }
  },
  setting: {
    MaxRequestConcurrent: 10,
    MaxUploadConcurrent: 1,
    MaxDownloadConcurrent: 10,
    MaxWebsocketConnect: 5,
    GameDownloadFileSizeLimit: 50,
    DownloadFileSizeLimit: 10
  },
  chromeDevtoolUrl:
    "https://chrome-devtools-frontend.appspot.com/serve_rev/@180870/",
  tbProxyUrl: "https://clients1.google.com/tbproxy/af/",

  weappUsrFileReqular,
  weappTmpFileReqular,
  weappStoreFileReqular,

  idePluginRegular: /^\/ideplugin\//,
  defaultUa:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1 qqdevtools/" +
    appVersion +
    " QQ/{{version}} Language/zh_CN webview/{{webviewID}}",
  Android_useragent:
    "Mozilla/5.0 (Linux; Android 4.4.4; AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38 Mobile Safari/537.36 qqdevtools/" +
    appVersion +
    " QQ/{{version}} webview/{{webviewID}}"
};
