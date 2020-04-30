// import eventBus from "@/components/debugger/eventBus"
// import store from "@/stores/vueStores";
// import projectManager from "@/common/utils/project/projectManager";
const path = require("path");
const fs = require("fs");

const spawn = require("child_process").spawn;

// 上传前预处理
function beforeUpload(projectCfg) {
  return cmd("beforeUpload", projectCfg);
}

// 预览前预处理
function beforePreview() {
  return cmd("beforePreview");
}

// 编译前预处理
function beforeCompile() {
  return cmd("beforeCompile");
}

function readProjectConfig(projectCfg) {
  // return new Promise((resolve, reject) => {
  let project = projectCfg;
  let projectConfigPath = path.join(project.path, "project.config.json");
  // console.log("project", project);
  let data = fs.readFileSync(projectConfigPath, "utf8");
  return data;
  // resolve(data);
  // });
}

function cmd(type, projectCfg) {
  return new Promise(async (resolve, reject) => {
    // console.log("projectCfg", projectCfg);
    let projectConfig = readProjectConfig(projectCfg);
    let currentProject = projectConfig || {};
    if ((currentProject.setting || {}).scriptsEnable === false) {
      // 没有启动自定义命令

      resolve();
      return;
    }

    if (
      (currentProject.setting || {}).scriptsEnable === undefined &&
      (!currentProject.scripts ||
        !currentProject.scripts.beforeCompile ||
        !currentProject.scripts.beforePreview ||
        !currentProject.scripts.beforeUpload)
    ) {
      resolve();
      return;
    }
    let cmd = (currentProject.scripts || {})[type] || "";
    let cwd = projectConfig.path || "";
    if (cmd) {
      // 存在前置命令
      let timeout = null;
      let tempCmdList = cmd.split(" ");
      global.customCompile = true;
      const std = spawn(tempCmdList[0], [...tempCmdList.slice(1)], {
        cwd,
        shell: true
      });

      // eventBus.emit('executeScript', {
      //   code: `console.log('正在执行自定义命令...')`
      // });

      std.stdout.on("data", data => {
        console.log(data);
        // eventBus.emit('executeScript', {
        //   code: `console.log(\`${data}\`)`
        // });
      });

      std.stderr.on("data", data => {
        console.log(data.toString());
        // eventBus.emit('executeScript', {
        //   code: `console.error(\`${data}\`)`
        // });
      });

      std.on("close", code => {
        console.log(`子进程退出码：${code}`);
        clearTimeout(timeout);
        setTimeout(function() {
          global.customCompile = false;
        }, 1000);
        resolve();
      });

      std.stderr.on("disconnect", () => {
        console.error("disconnect");
        global.customCompile = false;
        resolve();
      });
      timeout = setTimeout(function() {
        // 30s超时
        global.customCompile = false;
        resolve();
      }, 30000);
    } else {
      resolve();
    }
  });
}

module.exports = {
  beforeCompile,
  beforePreview,
  beforeUpload
};
