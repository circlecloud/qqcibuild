 const util = require("./common/utils"),
    shell = require("shelljs"),
    path = require("path"),
    fs = require("fs"),
    dirMap = require("./common/dirMap"),   
    aegis = require("./common/log/aegis"), 
    CICODE = require("./conf/error_code").CICODE,
    uploadProject = require("./cibuild");
const buildBasePath = dirMap["QQappdest"];

let start_time = 0;


function dealBuildError(appid, code, msg = "", type = 1, reportParams, image = {}) {
    try {
        util.rmdir(buildBasePath, false);
    } catch (err) { }
    let cost = +new Date() - start_time;

    let callback = reportParams.callback;
    callback && delete reportParams.callback;
    let params = {
        ...reportParams,
        appid: appid,
        cost: cost,
        retcode: type,//是否构建成功，0：成功，1：失败
        code: code,
        msg: msg,
    };
    if(code === 0){
        aegis.reportPv(10527,true);//成功
        aegis.infoAll(params, true);
    }else{
        aegis.reportPv(10528, true);//失败
        aegis.report(params, true);
    }
    setTimeout(()=>{
        callback && callback(type, image);
        process.exit(type);
    },2000)
} 

function initreport({ buildUser, version, desc, experience, type}) {
    //上报模调
    start_time = +new Date();
    //上报罗盘
    let reportParams = {
        user: buildUser,
        version: version,
        desc: desc,
        experience: (experience === true || experience === 'true') ? 1 : 0,
        type: type,//0:本地，1：蓝盾，2：橘子ci，3：github_actions，4：远程调试
    };
    // 拿到uin之后...
    aegis.setConfig({
        uin: buildUser,
        version: type //这里将version当作插件类型来上报
    })
    aegis.reportPv(10526, true);
    return reportParams;
}

// 读取packagejson文件中的版本号和版本描述
function getPackageJsonInfo(projectRoot, reportParams) {
    let file = path.resolve(projectRoot, './package.json');
    if (fs.existsSync(file)) {
        const packageJSON = require(path.resolve(projectRoot, './package.json'));
        if (packageJSON && packageJSON.version && packageJSON.uploadDesc) {
            return {
                version: packageJSON.version,
                uploadDesc: packageJSON.uploadDesc
            };
        } else {
            let msg = `package.json文件中${packageJSON && packageJSON.version || 'version为空'}  ${packageJSON &&packageJSON.uploadDesc || 'uploadDesc为空'}，请填写版本号version和版本描述uploadDesc`;
            console.log(msg);
            dealBuildError(0, CICODE.paramsError, msg, 1, reportParams);
            return false;
        }
    } else { 
        let msg = '项目根目录下package.json文件不存在';
        console.log(msg); 
        dealBuildError(0, CICODE.paramsError, msg, 1, reportParams);
        return false;
    }
       
}
//ci上传
function init() {
    const env = process.env;
    let version = env.PLUGIN_VERSION;
    version = version.replace(/\s*/g, '');
    let desc = env.PLUGIN_DESC;
    let appToken = env.PLUGIN_APPTOKEN;
    let buildUser = env.PLUGIN_BUILDUSER || 'CI';
    let experience = env.PLUGIN_EXPERIENCE || false;
    let firstPage = env.PLUGIN_FIRSTPAGE;
    let npmBuild = env.PLUGIN_NPMBUILD;
    let usePackageJson = env.PLUGIN_USEPACKAGEJSON;
    let type = env.GITHUB_ACTIONS === true || env.GITHUB_ACTIONS === 'true'?3:2;
    let reportParams = { buildUser, version, desc, experience, type: type };
    reportParams = initreport(reportParams)
    
    let projectpath = process.cwd(); //项目根目录
    
    if (usePackageJson === 'true' || usePackageJson === true) { 
        let info = getPackageJsonInfo(projectpath, reportParams); // 获取版本号 和 版本描述
        if (info) {
            version = info.version.replace(/\s*/g, '');
            desc = info.uploadDesc;
        } else { 
            return;
        }
    }
    
    if (!version || !desc || !appToken) {
        let msg = `请在ci配置或package.json文件中添加${version ? '' : '版本号VERSION '}${desc ? '' : '版本描述DESC '}${appToken ? '' : 'appToken'}`;
        console.log(msg);
        dealBuildError(0, CICODE.paramsError, '0:' + msg, 1, reportParams);
        return;
    }

    shell.cd(__dirname);
    shell.cd("..");

    uploadProject({ projectpath, version, desc, appToken, buildUser, experience, firstPage, reportParams, dealBuildError, npmBuild });
}

// 本地上传
function initDev() {
   
    // const argv = process.argv;
    let argv = ['', '','/Users/jingjingwu/file/02-项目代码/git/test_git','1.1.1','111','','','true']
    const env = process.env;
    if (env && env.PLUGIN_VERSION) {
        init();
    } else {
        if (argv.length < 5) {
            console.log("请依次输入路径、版本号、描述");
        } else {
            let projectpath = argv[2];
            let version = argv[3];
            let desc = argv[4];
            let firstPage = argv[5];
            let appToken = 'e52e2620e276d379eb2802c8795f8298';
            let usePackageJson = argv[6];
            let npmBuild = argv[7];
            //获取当前分支名
            // let branchlist = shell.exec("git symbolic-ref --short -q HEAD");
            // let currentname = '';
            // if (branchlist.code === 0) {
            //     currentname = branchlist.stdout.trim();
            // }
            //获取当前用户名
            let usernameexex = shell.exec("git config user.name");
            let username = '';
            if (usernameexex.code === 0) {
                username = usernameexex.stdout.trim();
            }

            let reportParams = initreport({ buildUser: username, version, desc, experience: false, type: 0 })
            
            if (usePackageJson === 'true' || usePackageJson === true) {
                let info = getPackageJsonInfo(projectpath, reportParams); // 获取版本号 和 版本描述
                if (info) {
                    version = info.version.replace(/\s*/g, '');
                    desc = info.uploadDesc;
                } else {
                    return;
                }
            }
            
            uploadProject({
                projectpath,
                version,
                desc,
                appToken,
                buildUser: username,
                firstPage,
                experience: false,
                dealBuildError,
                reportParams,
                npmBuild
            });
        }
    }
}

// 真机调试 编译上传
function initRemote(roomId) {

    const argv = process.argv;

    let projectpath = argv[2];
    let appToken = argv[3];
    let firstPage = argv[4];
    let reportParams = { buildUser:'remoteDebug', type: 4 };
    reportParams = initreport(reportParams)
    
    if (!projectpath) {
        let msg = '请填写项目路径';
        console.log(msg);
        dealBuildError(0, CICODE.paramsError, msg, 1, reportParams);
        return;
    }
    if (!appToken) {
        let msg = '请填写appToken';
        console.log(msg);
        dealBuildError(0, CICODE.paramsError, msg, 1, reportParams);
        return;
    }
    
    let params = {
        projectpath,
        appToken,
        firstPage,
        ifRemoteDebug: true,
        roomId,
        dealBuildError,
        reportParams
    }
    uploadProject(params);
}

function initLandun(params = {},callback) {
    console.log('params',params);
    let version = params.PLUGIN_VERSION || '';
    version = version.replace(/\s*/g, '');
    let desc = params.PLUGIN_DESC || '';
    let appToken = params.PLUGIN_APPTOKEN || '';
    let buildUser = params.PLUGIN_BUILDUSER || 'CI';
    let experience = params.PLUGIN_EXPERIENCE || false;
    let firstPage = params.PLUGIN_FIRSTPAGE;
    let npmBuild = params.PLUGIN_NPMBUILD;
    let codepath = params.PLUGIN_CODEPATH ? '/'+params.PLUGIN_CODEPATH : '';
    let projectpath = params.bkWorkspace + codepath;
    let usePackageJson = params.PLUGIN_USEPACKAGEJSON;

    let reportParams = { buildUser, version, desc, experience, type: 1  }
    reportParams = initreport(reportParams)
    reportParams.callback = callback;


    if (usePackageJson === 'true' || usePackageJson === true) {
        let info = getPackageJsonInfo(projectpath, reportParams); // 获取版本号 和 版本描述
        if (info) {
            version = info.version.replace(/\s*/g, '');
            desc = info.uploadDesc;
        } else {
            return;
        }
    }

    if (!version || !desc || !appToken) {
        let msg = `请在ci配置文件中添加${version ? '' : '版本号VERSION '}${desc ? '' : '版本描述DESC '}${appToken ? '' : 'appToken'}`;
        console.log(msg);
        dealBuildError(0, CICODE.paramsError, '0:' + msg, 1, reportParams);
        return;
    }

    uploadProject({
        projectpath,
        version,
        desc,
        appToken,
        buildUser,
        firstPage,
        experience,
        dealBuildError,
        reportParams,
        npmBuild
    });
}
module.exports = {
    initDev,
    init,
    initRemote,
    initLandun
};
