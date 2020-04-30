function a(a, b) {
  return function (...c) {
    if (c.length) {
      const a = c.pop();
      'function' !== typeof a && c.push(a)
    }
    return new Promise(function (d, e) {
      c.push(function (a, b) {
        a ? e(a) : d(b)
      }), a.apply(b || null, c)
    })
  }
}

function b() {
  return ++F
}

function c() {
  w.start_time = Date.now(), x.forEach((a) => w[a] = a.indexOf('extra') === 0 ? '' : 0)
}

function d() {
  w.pack_time = Date.now() - w.start_time;
  const a = {};
  x.forEach((b) => a[b] = w[b]);
}
async function e(a) {
  const b = n.dirname(a);
  try {
    await C(b)
  } catch (a) {
    await e(b)
  }
  try {
    await C(a);
    const b = await y(a);
    b && !b.isDirectory() && (await D(a, `${a}.bak`), console.warn(`${a} already exists but is not a directory, so it will be rename to a file with the suffix ending in '.bak'`), await z(a))
  } catch (b) {
    await z(a)
  }
}
async function f(a, b) {
  const c = await A(a);
  await g(c, b)
}
async function g(a, b) {
  await e(n.dirname(b)), await B(b, a)
}

function h(a, b) {
  b(a), Object.keys(a).forEach((c) => {
    const d = a[c];
    Array.isArray(d) && d.forEach((a) => {
      a && a.type && h(a, b)
    }), d && d.type && h(d, b)
  })
}

function i(a, b, c) {
  let d = q.parse(a, {
    sourceType: 'module',
    locations: !0
  });
  const e = [];
  let f = [];
  return h(d, (d) => {
    const g = d.callee,
      h = d.arguments;
    if (d.type === 'CallExpression' && g && g.type === 'Identifier' && g.name === 'require' && h && h.length === 1 && (h[0].type === 'Literal' ? e.push(h[0].value) : (c.push({
        jsPath: b,
        code: a.substring(d.start, d.end),
        startLine: d.loc.start.line,
        endLine: d.loc.end.line,
        tips: 'require variable is not allowed',
      msg: '不允许require变量'
      }), w.warn_require_var_num++)), d.type === 'ImportDeclaration') {
      const a = d.source,
        b = d.specifiers,
        c = {
          start: d.start,
          end: d.end
        },
        g = [];
      a && a.type === 'Literal' && (e.push(a.value), g.push(`var __TEMP__ = require('${a.value}');`)), b && Array.isArray(b) && b.forEach((a) => {
        if (a.type === 'ImportSpecifier') {
          const b = a.local,
            c = a.imported;
          b.type === 'Identifier' && c.type === 'Identifier' && g.push(`var ${b.name} = __TEMP__['${c.name}'];`)
        } else if (a.type === 'ImportDefaultSpecifier') {
          const b = a.local;
          b.type === 'Identifier' && g.push(`var ${b.name} = __REQUIRE_DEFAULT__(__TEMP__);`)
        } else if (a.type === 'ImportNamespaceSpecifier') {
          const b = a.local;
          b.type === 'Identifier' && g.push(`var ${b.name} = __REQUIRE_WILDCARD__(__TEMP__);`)
        }
      }), c.adjustContent = g.join(''), f.push(c)
    }
    if (d.type === 'ExportNamedDeclaration') {
      const b = d.source,
        c = d.specifiers,
        g = d.declaration;
      let h = !1;
      const i = {
          start: d.start,
          end: d.end
        },
        j = ['if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });'];
      if (b && b.type === 'Literal' && (e.push(b.value), j.push(`var __TEMP__ = require('${b.value}');`), h = !0), !g);
      else if (g.type === 'VariableDeclaration') {
        const b = g.declarations;
        b && Array.isArray(b) && b.forEach((b) => {
          if (b.type === 'VariableDeclarator') {
            const c = b.id,
              d = b.init;
            c && c.type === 'Identifier' && (i.notAddLines = !0, j.push(`var ${c.name} = exports.${c.name} = ${d?a.substring(d.start,d.end):'undefined'};`))
          }
        })
      } else if (g.type === 'FunctionDeclaration') {
        const b = g.id;
        b && b.type === 'Identifier' && (i.notAddLines = !0, j.push(`exports.${b.name} = ${a.substring(g.start,g.end)};`))
      } else if (g.type === 'ClassDeclaration') {
        const b = g.id;
        b && b.type === 'Identifier' && (i.notAddLines = !0, j.push(`exports.${b.name} = ${a.substring(g.start,g.end)};`))
      }
      c && Array.isArray(c) && c.forEach((a) => {
        if (a.type === 'ExportSpecifier') {
          const b = a.local,
            c = a.exported;
          b.type === 'Identifier' && c.type === 'Identifier' && j.push(`Object.defineProperty(exports, '${c.name}', { enumerable: true, get: function() { return ${h?'__TEMP__.':''}${b.name}; } });`)
        }
      }), i.adjustContent = j.join(''), f.push(i)
    } else if (d.type === 'ExportAllDeclaration') {
      const a = d.source,
        b = {
          start: d.start,
          end: d.end
        },
        c = ['if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });'];
      a && a.type === 'Literal' && (e.push(a.value), c.push(`var __TEMP__ = require('${a.value}');`)), c.push('Object.keys(__TEMP__).forEach(function(k) { if (k === "default" || k === "__esModule") return; Object.defineProperty(exports, k, { enumerable: true, get: function() { return __TEMP__[k]; } }); });'), b.adjustContent = c.join(''), f.push(b)
    } else if (d.type === 'ExportDefaultDeclaration') {
      const b = d.declaration,
        c = {
          start: d.start,
          end: d.end
        },
        e = ['if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });'];
      b && (c.notAddLines = !0, e.push(`exports.default = ${a.substring(b.start,b.end)};`)), c.adjustContent = e.join(''), f.push(c)
    }
    const i = d.expression;
    d.type === 'ExpressionStatement' && i && i.type === 'AssignmentExpression' && i.right.type === 'Identifier' && i.right.name === 'require' && (c.push({
      jsPath: b,
      code: a.substring(d.start, d.end),
      startLine: d.loc.start.line,
      endLine: d.loc.end.line,
      tips: 'assign require function to a variable is not allowed',
      msg: v.config.NOT_ALLOWED_REQUIRE_ASSIGN
    }), w.warn_require_rename_num++);
    const j = d.declarations;
    d.type === 'VariableDeclaration' && 0 < j.length && j.forEach((e) => {
      const f = e.init;
      e.type === 'VariableDeclarator' && f && f.type === 'Identifier' && f.name === 'require' && (c.push({
        jsPath: b,
        code: a.substring(d.start, d.end),
        startLine: d.loc.start.line,
        endLine: d.loc.end.line,
        tips: 'assign require function to a variable is not allowed',
        msg: v.config.NOT_ALLOWED_REQUIRE_ASSIGN
      }), w.warn_require_rename_num++)
    })
  }), f = f.sort((c, a) => a.start - c.start), f.forEach((b) => {
    const c = a.substring(b.start, b.end),
      d = b.notAddLines ? 0 : c.split('\n').length;
    a = a.substring(0, b.start) + b.adjustContent + Array(d).join('\n') + a.substring(b.end)
  }), {
    deps: e,
    parsedContent: a
  }
}
async function j(a, c, d, e, f, g) {
  if (c = n.normalize(c), f[c]) return f[c];
  const h = await A(c, 'utf8'),
    k = b(),
    l = n.relative(a, c);
  if (/\.json$/.test(c)) {
    const a = {
      id: k,
      name: l,
      content: `module.exports = ${h}`,
      deps: [],
      depsMap: {}
    };
    f[c] = k, e.push(a)
  } else {
    const {
      deps: b,
      parsedContent: m
    } = i(h, c, g), o = {
      id: k,
      name: l,
      content: m,
      deps: b,
      depsMap: {}
    };
    f[c] = k, e.push(o);
    for (const h of b) {
      let b, i = n.join(n.dirname(c), h);
      if (!/\.js$/.test(i) && !/\.json$/.test(i)) {
        const a = i + '.js';
        try {
          await C(a), i = a
        } catch (a) {}
      }
      try {
        const a = await y(i);
        a && a.isDirectory() && (i = n.join(i, 'index.js'))
      } catch (a) {}
      /\.js$/.test(i) || /\.json$/.test(i) || (i += '.js');
      try {
        await C(i), b = await j(a, i, d, e, f, g)
      } catch (a) {}
      b && (o.depsMap[h] = b)
    }
  }
  return k
}

function k(a, b, c, d) {
  const e = b.split('\n').length;
  for (let f = 1; f <= e; f++) a.addMapping({
    generated: {
      line: d + f,
      column: 0
    },
    original: {
      line: f,
      column: 0
    },
    source: c
  }), a.setSourceContent(c, b)
}
async function l(a, b, c) {
  try {
    const b = await y(a);
    b && b.isDirectory() && (a = n.join(a, 'index.js'))
  } catch (a) {}
  /\.js$/.test(a) || /\.json$/.test(a) || (a += '.js');
  try {
    await C(a)
  } catch (b) {
    return c.push({
      jsPath: a,
      code: '',
      tips: 'entry file is not found',
      msg: v.config.NOT_FOUND_NPM_ENTRY
    }), void w.warn_not_found_num++
  }
  const d = new r.SourceMapGenerator({
      file: 'index.js'
    }),
    e = [];
  await j(n.dirname(a), a, b, e, {}, c);
  const f = ['module.exports = (function() {', 'var __MODS__ = {};', 'var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };', 'var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };', 'var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };', 'var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };'];
  if (e.length) {
    const a = e.shift();
    f.push(`__DEFINE__(${a.id}, function(require, module, exports) {`), k(d, a.content, a.name, f.length), f.push(a.content), f.push(`}, function(modId) {var map = ${JSON.stringify(a.depsMap)}; return __REQUIRE__(map[modId], modId); })`);
    for (const a of e) f.push(`__DEFINE__(${a.id}, function(require, module, exports) {`), k(d, a.content, a.name, f.length), f.push(a.content), f.push(`}, function(modId) { var map = ${JSON.stringify(a.depsMap)}; return __REQUIRE__(map[modId], modId); })`);
    f.push(`return __REQUIRE__(${a.id});`)
  }
  return f.push('})()'), f.push('//# sourceMappingURL=index.js.map'), {
    js: f.join('\n'),
    map: d.toString()
  }
}
async function m(a, b) {
  let c = 'miniprogram_dist';
  b.miniprogram && typeof b.miniprogram === 'string' && (c = b.miniprogram);
  try {
    const b = n.join(a, c);
    await C(b);
    const d = await y(b);
    if (d && d.isDirectory()) return b
  } catch (a) {}
  return ''
}

const getAvailablePaths = (function () { // 这个在微信中是单独的一个文件，但看到只有这里引用到了，就不另外建文件了

  function a(b, c) {
    const d = new Set(Object.keys(b.package && b.package.dependencies || {})),
      e = [];
    for (let a = b; a;) {
      const b = a.children || [];
      for (let a of b) {
        const b = a.package && a.package.name || '';
        d.has(b) && (d.delete(b), e.push(a))
      }
      a = a.parent
    }
    for (const d of e) c.has(d) || (c.add(d), a(d, c))
  }
  async function b(b) {
    return new Promise((c, e) => {
      d(b, (b, d) => {
        if (b) return e(b);
        const f = new Set;
        try {
          a(d, f)
        } catch (a) {
          return e(a)
        }
        c(Array.from(f))
      })
    })
  }
  const c = require('path'),
    d = require('read-package-tree');
  return async function (a, d) {
    if (d && d.length) {
      const e = d.filter((a) => !/([\\\/]|\b)node_modules/.test(a)),
        f = [],
        g = {};
      for (const d of e) {
        const e = await b(c.join(a, c.dirname(d)));
        e.forEach((a) => f.push(a))
      }
      for (const a of f) {
        const b = a.isLink ? a.path : a.realpath;
        g[c.normalize(c.join(b, './package.json'))] = a
      }
      d = d.filter((b) => {
        const d = c.normalize(c.join(a, b));
        return !!g[d]
      })
    }
    return d
  }
})()

const n = require('path'),
  o = require('fs'),
  p = require('glob'),
  q = require('acorn'),
  r = require('source-map'),
  s = getAvailablePaths,
  // v = require('../../common/locales/index.js'),
  w = {
    start_time: Date.now(),
    pack_time: 0,
    miniprogram_pack_num: 0,
    other_pack_num: 0,
    warn_not_found_num: 0,
    warn_require_var_num: 0,
    warn_require_rename_num: 0,
    extra1: '',
    extra2: '',
    extra3: ''
  },
  x = ['pack_time', 'miniprogram_pack_num', 'other_pack_num', 'warn_not_found_num', 'warn_require_var_num', 'warn_require_rename_num', 'extra1', 'extra2', 'extra3'],
  y = a(o.stat),
  z = a(o.mkdir),
  A = a(o.readFile),
  B = a(o.writeFile),
  C = a(o.access),
  D = a(o.rename),
  E = a(p);
let F = Number(new Date);
module.exports = async function (a, b = {}) {
  c();
  const e = [];
  let h = await E('**/package.json', {
    cwd: a,
    nodir: !0,
    dot: !0,
    ignore: b.ignore || []
  });
  if (h = await s(a, h), !h || !h.length) return d(b.appid), null;
  for (const c of h) {
    const b = n.join(a, c);
    let d = await A(b, 'utf8');
    const h = n.dirname(b),
      i = h.replace(/([\b\/\\])node_modules([\b\/\\])/g, (a, b, c) => `${b}miniprogram_npm${c}`);
    d = JSON.parse(d);
    const j = n.join(h, d.main || 'index.js'),
      k = await m(h, d);
    if (k) {
      const a = await E('**/*', {
        cwd: k,
        nodir: !0,
        dot: !0,
        ignore: '**/node_modules/**'
      });
      for (const b of a) await f(n.join(k, b), n.join(i, b));
      w.miniprogram_pack_num++
    } else {
      const a = await l(j, i, e);
      if (!a) continue;
      await g(a.js, n.join(i, './index.js')), await g(a.map, n.join(i, './index.js.map')), w.other_pack_num++
    }
  }
  return d(b.appid), e
}
