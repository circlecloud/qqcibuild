// 全站返回码配置
var code = {

  'SUCCESS': 0,

  /**
   * [基础错误码] 未知错误码
   */
  'ERR_UNKNOWN': -1000,

  /*
   * [基础错误码] 请求参数错误
   */
  'ERR_REQUEST_PARAMS': -1001,

  /*
   * [基础错误码] SRF错误
   */
  'ERR_SRF_REQUEST': -1002,

  /**
   * [登录模块错误码] 未登录
   */
  'ERR_NOT_LOGIN': -2000,

  /**
   * [登录模块错误码] appid不存在或错误
   */
  'ERR_APPID_INVALID': -2001,

  /**
   * [登录模块错误码] ticket不存在或错误
   */
  'ERR_TICKET_INVALID': -2002,

  /**
   * [编译打包模块错误码] 解包出错或包格式非法
   */
  'ERR_UPLOAD_BUFFER_INVALID': -3000,

  /**
   * [编译打包模块错误码] 解原始包出错
   */
  'ERR_UNPACK_BUFFER': -3001,

  /**
   * [编译打包模块错误码] 打包出错
   */
  'ERR_PACK_BUFFER': -3002,

  /**
   * [编译打包模块错误码] 上传给后台出错
   */
  'ERR_UPLOAD_TO_BACKEND': -3003,

  /**
   * [编译打包模块错误码] 编译出错
   */
  'ERR_COMPILE': -3004,
  
  /**
   * [编译打包模块错误码] JSON解析错误
   */
  'PAGES_JSON_PARSE_ERR': -3005,
  /**
   * [编译打包，CI错误码]
   */
  'CICODE' : {
    success: 0,//成功
    paramsError: -1,//参数错误
    preCompileError: -2,//预编译失败
    compileError: -3,//编译失败
    uploadError: -4,//上传失败
    qrcodeError: -5,//生成二维码失败
    otherError: -6,//其他错误
    getConfigError:-7,
    npmBuildError:-8,//npm构建失败
  }
};

module.exports = code;