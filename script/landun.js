var nodejs_atom_sdk = require('@tencent/nodejs_atom_sdk');

const index = require("../compile/index");
const params = nodejs_atom_sdk.getInputParams();

index.initLandun(params, function (type, { link, qrcodePath, base64, md5 } = {}){
  nodejs_atom_sdk.setOutput({
    "type": nodejs_atom_sdk.BK_OUTPUT_TEMPLATE_TYPE.DEFAULT,
    "status": type === 0 ? nodejs_atom_sdk.BK_ATOM_STATUS.SUCCESS : nodejs_atom_sdk.BK_ATOM_STATUS.FAILURE,
    "data": {
      "qqminiapp_url": {
        "type": "string",
        "value": link || ''
      },
      "qrcode_path": {
        "type": "string",
        "value": qrcodePath || ''
      },
      "qrcode_base64": {
        "type": "string",
        "value": base64||""
      },
      "qrcode_md5": {
        "type": "string",
        "value": md5 || ""
      },
      "qrcode": {
        "type": "artifact",
        "value": [qrcodePath] 
      },
    }
  });
});
