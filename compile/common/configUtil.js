const fs = require("fs"),
  path = require("path"),
  g = a =>
    Object.prototype.toString
      .call(a)
      .toLowerCase()
      .slice(8, -1),
  h = (a = "") => {
    return a
      ? ((a = normalizePath(a + "/")),
        a
          .replace(/\.\.\//g, "")
          .replace(/^\//, "")
          .replace(/^\.\//, ""))
      : a;
  },
  i = [
    "svr",
    "client",
    "qcloudRoot",
    "miniprogramRoot",
    "pluginRoot",
    "cloudfunctionRoot",
    "jsserverRoot"
  ];

function normalizePath(a) {
  const b = path.posix.normalize(a.replace(/\\/g, "/"));
  return (a.startsWith("//") || a.startsWith("\\\\")) && !b.startsWith("//")
    ? "/" + b
    : b;
}
let f = {
  configFileExists(c) {
    if (!c) {
      return {
        error: new Error("project not valid")
      };
    }
    const d = {
        error: null
      },
      e = path.join(c.projectpath, "project.config.json");
    try {
      const b = fs.existsSync(e);
      d.exists = b;
    } catch (a) {
      d.error = a;
    }
    return d;
  },
  getConfigFileInfo(c) {
    if (!c) {
      return {
        error: new Error("project not valid")
      };
    }
    const d = {
        error: null
      },
      e = path.join(c.projectpath, "project.config.json");
    try {
      let b, j, k;
      try {
        j = fs.readFileSync(e);
      } catch (a) {
        b = a;
        const d = f.configFileExists(c);
        throw ((b.type = d.error || d.exists ? "readerror" : "notexists"), a);
      }
      try {
        k = JSON.parse(j);
      } catch (a) {
        throw ((b = a), (a.type = "parseerror"), a);
      }
      if ("object" !== g(k))
        throw ((b = new Error("config is not an object")),
        (b.type = "parseerror"),
        b);
      (d.raw = j),
        (k.condiction = k.condition),
        delete k.condition,
        (d.config = k),
        d.config.compileType == "miniprogram" &&
          (d.config.compileType = "weapp"),
        d.config.condiction &&
          d.config.condiction.miniprogram &&
          ((d.config.condiction.weapp = d.config.condiction.miniprogram),
          delete d.config.condiction.miniprogram),
        (d.config.setting && !1 === d.config.setting.newFeature) ||
          (d.config.setting = Object.assign({}, d.config.setting, {
            newFeature: !0
          })),
        i.forEach(a => {
          typeof d.config[a] === "string" && (d.config[a] = h(d.config[a]));
        });
    } catch (a) {
      d.error = a;
    }
    return d;
  },
  writeObjectToConfigFile(c, d) {
    if (!c) return { error: new Error("project not valid") };
    if ("object" !== g(d))
      return { error: new Error("content is not an object") };
    const f = { error: null },
      e = path.join(c.projectpath, "project.config.json");
    try {
      (d = Object.assign({}, d)),
        (d.condition = Object.assign({}, d.condiction)),
        delete d.condiction,
        "weapp" == d.compileType && (d.compileType = "miniprogram"),
        d.condition &&
          d.condition.weapp &&
          ((d.condition.miniprogram = d.condition.weapp),
          delete d.condition.weapp),
        c.isGameTourist && (d.isGameTourist = !0),
        i.forEach(a => {
          "string" == typeof d[a] && d[a] ? (d[a] = h(d[a])) : delete d[a];
        });
      const b = JSON.stringify(d, null, "\t");
      fs.writeFileSync(e, b);
    } catch (a) {
      console.error(a)((a.type = "writeerror")), (f.error = a);
    }
    return f;
  },
  generateConfigTemplate() {
    return {
      description: "项目配置文件",
      packOptions: {
        ignore: []
      }
    };
  }
};

module.exports = f;
