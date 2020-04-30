function b(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  const c = /\d+/g,
    d = a.match(c),
    e = b.match(c);
  if (!d) return 1;
  if (!e) return -1;
  const f = d.map(a => parseInt(a)),
    g = e.map(a => parseInt(a)),
    h = d.length > e.length ? e.length : d.length;
  for (let c = 0; c < h; c++) {
    if (f[c] < g[c]) return -1;
    if (f[c] > g[c]) return 1;
  }
  return f.length === g.length ? 0 : f.length < g.length ? -1 : 1;
}

function e(a) {
  try {
    if (((a = l.resolve(a)), !k.existsSync(a))) return;
    let b = k.statSync(a);
    if (b.isDirectory()) {
      let b = k.readdirSync(a);
      if (0 < b.length)
        for (let c = 0, d = b.length; c < d; c++) e(l.join(a, b[c]));
      k.rmdirSync(a);
    } else {
      k.unlinkSync(a);
    }
  } catch (a) {}
}

function f(a, b) {
  try {
    if (((a = l.resolve(a)), (b = l.resolve(b)), !k.existsSync(a))) return;
    if (k.existsSync(b)) {
      let c = k.statSync(b),
        d = k.statSync(a);
      if (d.isDirectory() && c.isDirectory()) {
        let c = k.readdirSync(a);
        for (let d = 0, e = c.length; d < e; d++)
          f(l.join(a, c[d]), l.join(b, c[d]));
        return void k.rmdirSync(a);
      }
      c.isDirectory() && rmdirSync(b);
    }
    k.renameSync(a, b);
  } catch (a) {}
}

function g(a) {
  if (((a = l.resolve(a)), k.existsSync(a))) {
    let b = k.statSync(a);
    if (b.isDirectory()) return;
    k.unlinkSync(a);
  }
  g(l.dirname(a)), k.mkdirSync(a);
}

function h(a, b) {
  if (((a = l.resolve(a)), (b = l.resolve(b)), !!k.existsSync(a))) {
    let c = k.lstatSync(a);
    if (c.isDirectory()) {
      g(b);
      let c = k.readdirSync(a);
      for (let d = 0, e = c.length; d < e; d++)
        h(l.join(a, c[d]), l.join(b, c[d]));
    } else {
      if (k.existsSync(b)) {
        let a = k.lstatSync(b);
        if (a.isDirectory()) {
          let a = l.dirname(b),
            c = l.join(a, "" + Math.random());
          for (; k.existsSync(c) || c == b; ) c = l.join(a, "" + Math.random());
          k.renameSync(b, c);
        }
      }
      g(l.dirname(b)),
        k.writeFileSync(b, k.readFileSync(a), {
          mode: w(c.mode)
        });
    }
  }
}

function i(a) {
  const b = n.createHash("md5");
  return b.update(a), b.digest("hex");
}

function j(a, b = "`") {
  return a
    ? b === "`"
      ? a
          .replace(/\\/g, "\\\\")
          .replace(/`/g, "\\`")
          .replace(/\$/g, "\\$")
      : b === '"'
      ? a
          .replace(/\\/g, "\\\\")
          .replace(/\r\n/g, "\n")
          .replace(/\n/g, "\\n")
          .replace(/"/g, '\\"')
      : b === "'"
      ? a
          .replace(/\\/g, "\\\\")
          .replace(/\r\n/g, "\n")
          .replace(/\n/g, "\\n")
          .replace(/'/g, "\\'")
      : void 0
    : a;
}
const k = require("fs"),
  l = require("path"),
  n = require("crypto");
const w = a => {
    let b;
    return (
      (b = typeof a === "number" ? a.toString(8) : a), b.substring(b.length - 3)
    );
  },
  x = (function() {
    let a = 0;
    return function(b) {
      a++;
      const { data: c, type: d, autoRemove: e } = b,
        f = j(c, "`");
      let g = "";
      return (
        d === "text"
          ? ((g = `scriptNode.text = \`${f}`),
            (g += e
              ? `;
        const node = global.__global.document.getElementById('\${fnName}');
        node.parentElement.removeChild(node)
        \``
              : "`;"))
          : d === "link" &&
            ((g = `scriptNode.src = \`${f}\`;`),
            e &&
              (g += `scriptNode.onload = function() {
          const node = document.getElementById(fnName);
          node.parentElement.removeChild(node)
        }`)),
        `
      ;(function(global){
        const container = document.getElementsByTagName("head")[0]
        const scriptNode = document.createElement('script')
        scriptNode.type = "text/javascript";
        const fnName = "script${a}"
        scriptNode.id = fnName
        ${g}
        container.appendChild(scriptNode)
      })(this);
    `
      );
    };
  })();
module.exports = {
  getType: function(a) {
    return Object.prototype.toString
      .call(a)
      .toLowerCase()
      .split(" ")[1]
      .replace("]", "");
  },
  getAppConfig: function() {
    return {
      isDev:
        !!process.execPath.match("nw.exe") ||
        !!process.execPath.match("nwjs.app") ||
        !!process.execPath.match("nwjs.exe"),
      isBeta: !0 === nw.App.manifest.beta,
      isGamma: !0 === nw.App.manifest.gamma
    };
  },
  openInspectWin: function() {
    nw.Window.open(
      "about:blank",
      {
        show: !1,
        width: 799,
        height: 799
      },
      a => {
        a.maximize(),
          (a.window.location = "chrome://inspect/#devices"),
          a.show();
      }
    );
  },

  compareSemVer: b,
  rmSync: e,
  mvSync: f,
  cpSync: h,
  mkdirSync: g,
  getQuery: function(a = "") {
    a = a.replace(/^\?/, "");
    let b = a.split("&"),
      c = {};
    for (let d, e = 0, f = b.length; e < f; e++)
      (d = (b[e] || "").split("=")), (c[d[0]] = decodeURIComponent(d[1]));
    return c;
  },
  normalizePath: function(a = "") {
    const b = l.posix.normalize(a.replace(/\\/g, "/"));
    return (a.startsWith("//") || a.startsWith("\\\\")) && !b.startsWith("//")
      ? "/" + b
      : b;
  },
  generateMD5: i,
  chooseFile: async function(a) {
    const b = global.windowMap.get("MAIN").window,
      c = document.createElement("input");
    return (
      (c.style.display = "none"),
      c.setAttribute("type", "file"),
      a.accept && c.setAttribute("accept", a.accept),
      a.multiple && c.setAttribute("multiple", "multiple"),
      b.document.body.appendChild(c),
      c.click(),
      new Promise(a => {
        c.addEventListener("change", d => {
          b.document.body.removeChild(c),
            a({
              success: !0,
              event: d
            });
        }),
          c.addEventListener("cancel", d => {
            b.document.body.removeChild(c),
              a({
                success: !1,
                event: d
              });
          });
      })
    );
  },
  fillArray: function(b, c) {
    if (c == 0) return [];
    for (var d = [b]; 2 * d.length <= c; ) d = d.concat(d);
    return d.length < c && (d = d.concat(d.slice(0, c - d.length))), d;
  },
  random: function() {
    return i(Math.random() + "" + Date.now());
  },
  escapeScript: function(a) {
    return a
      ? a.replace(/<script/g, "&lt;script").replace(/<\/script/g, "&lt;/script")
      : a;
  },
  executeScript: function(a, b) {
    const { code: c, webview: d } = a;
    if (d && c) {
      let a = `(function(){
    delete this.nw;
    this.chrome = null
  })();`;
      d._webview
        ? d._webview.executeScript(
            {
              code: a + c
            },
            b
          )
        : d.executeScript(
            {
              code: a + c
            },
            b
          );
    }
  },
  escapeQuot: j,
  webviewScriptCreator: x,
  shouldUseConfigFile: function(a) {
    if ("darwin" !== process.platform && "linux" !== process.platform) {
      if (128 < a.length) return !0;
      for (const b of a) if (1e4 < b.length) return !0;
    }
    return !1;
  }
};
