const zlib = require("zlib");
const http = require("./common/http");

export default (pkgInfo, info) => {
  console.log("pkgInfo info", pkgInfo, info);
  let buf = zlib.gzipSync(pkgInfo.data);
  console.log("buf", buf);
  let uploadUrl = `/upload/preview/`;
  console.log(uploadUrl, {
    body: buf,
    qs: info,
    json: false,
    interfaceId: 162000131
  });
  // 上传
  return http
    .post(uploadUrl, {
      body: buf,
      qs: info,
      json: false,
      interfaceId: 162000131
    })
    .then(data => {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.log(data);
        console.error(e);
        return null;
      }
    });
};
