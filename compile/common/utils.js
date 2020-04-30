const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

function rmdir(filePath, isRmDir = true) {
  try {
    if (!fs.existsSync(filePath)) return;
    let f = fs.statSync(filePath);
    if (f.isDirectory()) {
      let f = fs.readdirSync(filePath);
      if (0 < f.length) {
        for (let b = 0, e = f.length; b < e; b++) {
          rmdir(path.join(filePath, f[b]), true);
        }
      }

      isRmDir && fs.rmdirSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error(e);
  }
}

function encrypt(word) {
  var secretkey = "1234QWERASDFZXCV"; //唯一（公共）秘钥
  var content = word;
  var cipher = crypto.createCipher("aes192", secretkey); //使用aes192加密
  var enc = cipher.update(content, "utf8", "hex"); //编码方式从utf-8转为hex;
  enc += cipher.final("hex"); //编码方式转为hex;
  return enc;
}

function decrypt(word) {
  var secretkey = "1234QWERASDFZXCV";
  var decipher = crypto.createDecipher("aes192", secretkey);
  var dec = decipher.update(word, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

function shouldUseConfigFile(a) {
  if ("darwin" !== process.platform && "linux" !== process.platform) {
    if (128 < a.length) return !0;
    for (const b of a) if (1e4 < b.length) return !0;
  }
  return !1;
}

function random() {
  return i(Math.random() + "" + Date.now());
}

function i(a) {
  const b = crypto.createHash("md5");
  return b.update(a), b.digest("hex");
}
const getRandomIntBetween = function(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
};

/**
 * 生成TraceId，用于后台跟踪请求日志
 * traceId格式: QQ+"_"+2字符（月份）+2字符(天)+2字符（小时)+2字符(分钟)+2字符(秒)+3字符（毫秒）+"_"+rand(10000,99999)
 * example: uin_0308060901003_11111
 */

const generateTraceId = function(uid) {
  const ran = getRandomIntBetween(10000, 99999);
  const now = new Date();
  const str_time =
    String(new Date().getMonth() + 1).padStart(2, "0") +
    String(new Date().getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0") +
    String(new Date().getMilliseconds()).padStart(3, "0");

  return [uid, str_time, ran].join("_");
};
module.exports = {
  rmdir,
  decrypt,
  encrypt,
  shouldUseConfigFile,
  random,
  getRandomIntBetween,
  generateTraceId
};
