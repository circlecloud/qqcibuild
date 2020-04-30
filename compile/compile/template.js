'use strict';
const path = require('path')
const fs = require('fs')
let htmlBegin = `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval'">
    <link rel="icon" href="data:image/ico;base64,aWNv">
    <script>
      var __pageFrameStartTime__ = Date.now();
      var __webviewId__;
      var __wxAppCode__ = {};
      var __WXML_GLOBAL__ = {
          entrys: {},
          defines: {},
          modules: {},
          ops: [],
          wxs_nf_init: undefined,
          total_ops: 0
      };
        `,
  htmlEnd = `var __pageFrameEndTime__ = Date.now()
    </script>
  </head>
<body>
  <div></div>
</body>
</html>`
let cssBegin = `  <style> </style>  <page></page>   <script>  `
let cssTimeBegin = `var __setCssStartTime__ = Date.now(); `
let cssTimeEnd = `  var __setCssEndTime__ = Date.now(); `
let cssEnd = `</script>`
let jsBegin = 'var __pageFrameStartTime__ = Date.now();   var __webviewId__;  var __wxAppCode__={};   var __WXML_GLOBAL__={entrys:{},defines:{},modules:{},ops:[],wxs_nf_init:undefined,total_ops:0};'
let jsEnd = ';var __pageFrameEndTime__ = Date.now()'
let subJsBegin = 'var __webviewId__ = __webviewId__;  var __wxAppCode__= __wxAppCode__ || {};   var __WXML_GLOBAL__= __WXML_GLOBAL__ || {entrys:{},defines:{},modules:{},ops:[],wxs_nf_init:undefined,total_ops:0};   var __subPageFrameStartTime__ = Date.now();'
let subJsEnd = ';var __subPageFrameEndTime__ = Date.now()'
let pageframeBegin = 'var __pageFrameJsStartTime__ = Date.now();'

module.exports = {
  htmlBegin,
  htmlEnd,
  cssBegin,
  cssTimeBegin,
  cssTimeEnd,
  cssEnd,
  jsBegin,
  jsEnd,
  subJsBegin,
  subJsEnd,
  pageframeBegin
}
