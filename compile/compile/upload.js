const zlib = require("zlib");
const http = require("../common/http");
const post = http.post;

// import store from "@/stores/vueStores";
// import windowUtil from "@/common/utils/windowUtil";
// import logger from "@/common/log/log";

const uploadUrl = `/ide/upload`;
const submitUrl = `/ide/submit`;

module.exports = function upload(dataArr, info) {
  return new Promise((resolve, reject) => {
    const start = +new Date();
    let infoArr = Array.from(dataArr);
    let len = infoArr.length;
    let count = 5;
    let split = Buffer.from("<>|<>");
    let list = [];
    for (let i = 0; i < Math.ceil(len / count); i++) {
      let arr = infoArr.splice(0, count);
      let content;
      let fileName = [];
      arr.forEach((item, index) => {
        if (index == 0) {
          content = item.pkgBuffer;
        } else {
          content = Buffer.concat([
            content,
            split,
            item.pkgBuffer
          ]);
        }
        fileName.push(item.name);
      });
      let buf = zlib.gzipSync(content);

      list.push(
        post(uploadUrl, {
          body: buf,
          headers: { 'x-uin': info.buildUser || '' },
          qs: {
            type: info.type,
            appid: info.appid,
            appToken: info.appToken,
            path: info.pathname,
            fileName: JSON.stringify(fileName)
          },
          json: false
        })
      );
    }
    Promise.all(list).then(data => {
      let pkgArr = [];
      for (let i = 0; i < data.length; i++) {
        try {
          let item = JSON.parse(data[i]);
          if (item.code == 0) {
            pkgArr = pkgArr.concat(item.data);
          } else {
            if (item.code + "" === "-3000") {
              // logger.error(new Error("登陆态失效"));
              // store.commit("user/logout");
              // windowUtil.openLogin();
              return;
            }
            reject({
              code: item.code,
              msg: item.msg || ""
            });
            return;
          }
        } catch (err) {
          console.error(err);
          reject({
            code: -1,
            msg: "网络错误"
          });
          return;
        }
      }

      pkgArr = pkgArr.map(item => {
        dataArr.some(itm => {
          if (item.fileName == itm.name) {
            item.fileSize = itm.size;
            return true;
          }
        });
        return item;
      });
      let uploadParam;
      if (info.type === 0 || info.type === 1) {
        // 上传,体验
        uploadParam = {
          type: info.type,
          appid: info.appid,
          version: info.version,
          intro: info.intro
        };
        if (info.path) {
          uploadParam.firstPage = info.path;
        }
      } else {
        // 预览/debug
        if (info.type == 6) {
          info.type = 4;
        }
        uploadParam = {
          type: info.type,
          appid: info.appid,
          firstPage: info.path,
          roomId: info.roomId
        };
      }
      let bodyData = {
        uploadParam,
        appconfig: {
          subPackages: info.appconfig.subPackages,
          compileType: info.appconfig.compileType,
          mainPages: info.appconfig.mainPages,
          pages: info.appconfig.pages
        },
        pkgArr
      };
      if (info.appconfig.compileType === "game" && info.appconfig.offline) {
        bodyData.appconfig.offline = 1;
      }
      post(submitUrl, {
        body: JSON.stringify(bodyData),
        headers: { 'x-uin': info.buildUser || '' },
        qs: {
          appToken: info.appToken
        },
        json: false
      })
        .then(data => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            console.error(err);
            reject({
              code: -2,
              msg: "上传失败"
            });
          }
          // console.error("upload ok. cost:", +new Date() - start);
          // console.error(data);
        })
        .catch(err => {
          console.error(err);
          reject({
            code: -3,
            msg: "上传失败"
          });
        });
    }).catch(err => { 
      console.error('请求出错',err);
    });
  });
};
