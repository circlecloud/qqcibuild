const  Aegis = require('@tencent/aegis-node-sdk');
var aegis = new Aegis({
    id: 1695 // 在 aegis.ivwe.io 申请到的 id
});

module.exports = aegis;