const npmBuild = require("./npmBuild");
const exec = require('child_process').exec;
const fs = require("fs");
const path = require("path");
async function build(project) {
    const timeBegin = Date.now();
    let isBuildError = false,
        errmsg = '',
        buildResult;
    try {
        const rootDir = path.join(
            project.path,
            project.compileType === 'plugin'
                ? project.pluginRoot || ''
                : project.miniprogramRoot || ''
        );
        buildResult = await npmBuild(rootDir);
    } catch (e) {
        console.error('npmBuild error', e);
        errmsg = 'npmBuild error: '+e.message;
        isBuildError = true;
    }
    if (!isBuildError) {
        if (buildResult) {
            let timeEnd = Date.now();
            console.log(
                [
                    `完成构建。耗时 ${timeEnd - timeBegin} 毫秒。`,
                    ...(buildResult || []).map((a, b) => {
                        const c =
                            typeof a.startLine === 'number'
                                ? `${a.jsPath}:${a.startLine}-${a.endLine}`
                                : a.jsPath;
                        return `${b + 1}. ${c}: ${a.msg}`;
                    })
                ].join('\n')
            );
            return [true,''];
        } else {
            console.error('没有找到 node_modules 目录。');
            return [false, '没有找到 node_modules 目录。'];
        }
    }else{
        return [false, errmsg];
    }
}

//执行tnpm install
function tnpminstall(projectpath){
    return new Promise((resolve,reject)=>{
        const ls = exec('npm install', {
            cwd: projectpath
        });

        ls.stdout.on('data', (data) => {
            console.log(`[npm install]stdout: ${data}`);
        });

        ls.stderr.on('data', (data) => {
            console.log(`[npm install]stderr: ${data}`);
        });
        ls.on('exit', function (code) {
            console.log('[npm install]child process exited with code ' + code);
            code === 0?resolve(true): reject(false);
        });
        ls.on('close', (code) => {
            console.log(`[npm install]child process exited with code ${code}`);
            code === 0 ? resolve(true) : reject(false);
        });
    })
    
}

module.exports = async function (projectpath, projectInfo){
    //判断package.json文件是否存在
    let packagePath = path.join(projectpath,'./package.json');
    if (fs.existsSync(packagePath)){
        let res1 = await tnpminstall(projectpath);
        if(res1){
            let res2 = await build(projectInfo);
            return res2;
        }else{
            return [false,'npm install失败']
        }
    }else{
        console.error('package.json文件不存在')
        return [false, 'package.json文件不存在'];
    }
}