# qq小程序ci构建工具

> qq小程序开发者可以在小程序项目中接入ci，并使用qq小程序ci构建镜像，在git操作时触发构建操作上传版本到qq小程序管理端。支持设置体验版、设置小程序默认打开的页面路径

## Docker Image

- qqminiapp/build:latest

## 示例

### Orange-ci

```yaml
master:
  push:
    - stages:
      - name: qqminiapp cibuild
        image: qqminiapp/build:latest
        settings:
          version: 1.0.0
          desc: qq小程序
          appToken: xxx
          buildUser: $ORANGE_BRANCH
          experience: true
          filePath: qrcode.png
          #firstPage: pages/logs/logs?id=111
      
      # 推送二维码到企业微信
      - name: send file
        type: wework:file
        options:
          filePath: qrcode.png
```

### Github-action

```yaml
name: CI

on:
  push:
    branches:
    - master

jobs:
  build-qq-ci:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout 
      uses: actions/checkout@master
    - name: Build 
      uses: docker://qqminiapp/build:latest
      env: 
        PLUGIN_VERSION: 1.0.0
        PLUGIN_DESC: CI自动构建上传
        PLUGIN_APPTOKEN: ${{ secrets.APPTOKEN }}
        PLUGIN_BUILDUSER: ${{ github.actor }}
        PLUGIN_EXPERIENCE: true
        #PLUGIN_FIRSTPAGE: pages/logs/logs?id=111
```

### Drone CI

```yaml
kind: pipeline
name: default

steps:
  - name: CI Auto Build
    image: qqminiapp/build:latest
    settings:
      version: 1.0.0
      desc: CI自动构建上传
      appToken: xxx
      buildUser: ${DRONE_REPO_OWNER}
      experience: true
      #firstPage: pages/logs/logs?id=111
    when:
      event: push 
      branch: master
```

## 输入

- `version`：小程序版本号
- `desc`：小程序版本描述
- `appToken`qq小程序管理端获取的apptoken
- `buildUser`：小程序开发版的发布者（小程序管理端->开发管理->开发版本的发布者）。
- `experience` 是否设置为体验版 true:设置当前版本为体验版，不填或false则只上传开发版，不会设置为体验版
- `firstPage`：小程序默认打开的页面路径，如 `pages/logs/logs?id=111`
- `filePath`：默认值 `qrcode.png`，ci构建时生成的二维码相对路径。如果experience为true则是体验版二维码，否则是开发版二维码。

## 获取appToken

1. 打开qq小程序管理端[https://q.qq.com](https://q.qq.com/)
2. 登录
3. 进入设置页面
4. 进入开发设置页
5. 点击生成appToken
6. 管理员扫码
7. 得到appToken