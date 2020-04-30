'use strict';
var _extends =
  Object.assign ||
  function(a) {
    for (var b, c = 1; c < arguments.length; c++)
      for (var d in ((b = arguments[c]), b))
        Object.prototype.hasOwnProperty.call(b, d) && (a[d] = b[d]);
    return a;
  };
if ("yes" !== process.env.START_SERVER && !process.env.workerIdentifier)
  module.exports = {
    fileName: __filename,
    dirName: __dirname
  };
else {
  function a() {
    setTimeout(a, 60000);
  }

  function b() {
    for (const a of [...A])
      console.log("killing prime children", a.process.pid),
        C.delete(a),
        a.kill("SIGTERM");
    A = [];
  }

  function c() {
    process.on("message", a => {
      a && "object" == typeof a
        ? q(a)
        : console.warn("master received unrecognized msg", a);
    }),
      process.on("disconnect", g),
      process;
    let b = 10;
    const c = async () => {
      try {
        await d();
      } catch (a) {
        0 < b--
          ? setTimeout(() => {
            c();
          }, 400)
          : g();
      }
    };
    c(), a();
  }

  function d() {
    u.isMaster && 0 < A.length && b();
    let a = !1;
    const c = new Promise((b, c) => {
      u.isMaster &&
      setTimeout(() => {
        process.env.workerIdentifier || a || c();
      }, 1e4),
        t(
          f,
          _extends({}, F, {
            workers: A,
            identifier: "prime",
            count: 1,
            workerListener: c =>
              F.workerListener(c, function() {
                (a = !0), b();
              })
          })
        );
    });
    return c.then(
      b => {
        return (a = !0), b;
      },
      a => {
        throw a;
      }
    );
  }

  function e(a = 1) {
    t(
      f,
      _extends({}, F, {
        workers: B,
        count: a,
        identifier: "plain"
      })
    );
  }

  function f() {
    process.on("message", a => {
      a && "object" == typeof a
        ? h(a)
        : console.warn("child received unrecognized msg", a);
    }),
      process.on("disconnect", g),
      process.send({
        pid: process.pid,
        type: "initchildsuccess",
        workerIdentifier: process.env.workerIdentifier || ""
      }),
      a();
  }

  function g() {
    try {
      process.exit(),
        setTimeout(() => {
          process.kill(process.pid, "SIGTERM");
        }, 5e3);
    } catch (a) {
      process.kill(process.pid, "SIGTERM");
    }
  }
  async function h(a) {
    if ("task" === a.type)
      try {
        //const b = await v(a.path, a.query, a.body);
        const b = await v(a.path, a.param);
        process.send({
          type: "taskresult",
          id: a.id,
          result: b,
          pid: process.pid
        });
      } catch (b) {
        process.send({
          type: "taskerror",
          id: a.id,
          error: (b.toString && b.toString()) || `${b}`,
          pid: process.pid
        });
      }
    else if ("downgrade" === a.type)
      if (process.memoryUsage) {
        const a = process.memoryUsage().rss / 1024 / 1024;
        100 < a
          ? (console.log("prime children used a lot of memory, suicide."), g())
          : global.gc && global.gc();
      } else global.gc && global.gc();
  }

  function i(a) {
    const b = Math.min(a, y - B.length);
    !b || 0 >= b || e(b);
  }

  function j() {
    const a = B;
    B = [];
    for (const b of [...a]) C.delete(b), b.kill("SIGTERM");
    for (const a of A)
      a.send({
        type: "downgrade"
      });
  }

  function k() {
    const a = [...A, ...B];
    for (const b of a) if ((C.get(b) || {}).idle) return b;
    return null;
  }

  function l(a) {
    const b = C.get(a);
    b
      ? C.set(a, {
        idle: !1
      })
      : console.warn("use worker not found", a.process.pid);
  }

  function m(a) {
    const b = C.get(a);
    b
      ? C.set(a, {
        idle: !0
      })
      : console.warn("unuse worker not found", a.process.pid);
  }

  function n() {
    const a = [];
    for (const b in E) {
      const c = E[b];
      c._processed || a.push(c);
    }
    return a;
  }

  function o() {
    clearTimeout(z), (z = void 0);
    const a = n();
    //console.error('in o',a,A)
    if (!(1 > a.length)) {
      1 > A.length &&
      (console.log("prime children have been killed, relaunch"), d()),
        console.log("will process", a.length, "tasks");
      const b = !a.every(a => "yes" === (a.headers || {}).downgrade);
      for (const c of a) {
        const d = k();
        if (d) l(d), D.add(c.id), d.send(c), (c._processed = !0);
        else {
          b && i(a.length - 1);
          break;
        }
      }
    }
  }

  function p() {
    z == void 0 &&
    (z = setTimeout(() => {
      o();
    }, 80));
  }

  function q(a) {
    "task" === a.type && ((E[a.id] = a), p());
  }

  function r(a) {
    if ("initchildsuccess" === a.type) {
      process.send({
        type: "initsuccess",
        timestamp: Date.now(),
        pid: process.pid
      });
      let b = [];
      "prime" === a.workerIdentifier
        ? (b = A)
        : "plain" === a.workerIdentifier && (b = B);
      const c = b.findIndex(b => b.process.pid === a.pid);
      if (0 <= c) {
        const a = b[c];
        C.set(a, {
          idle: !0
        });
      } else console.warn("init child success cannot find", a.pid);
      p();
    } else if ("taskerror" === a.type || "taskresult" === a.type) {
      delete E[a.id], process.send(a);
      const b = [...A, ...B];
      let c = !1;
      for (const d of b)
        if (d.process.pid === a.pid) {
          m(d), (c = !0);
          break;
        }
      D.delete(a.id),
      1 > D.size && 1 > n().length && j(),
      c || console.warn("unknown worker result", a.pid),
        p();
    } else console.warn("onReceivedWorkerMessage invalid msg type", a);
  }
  const s = require("os"),
    t = require("./master.js"),
    u = require("cluster"),
    v = require("./processTask.js"),
    { SelfManagedMap: w } = require("./selfManagedMap.js");
  process.on("unhandledRejection", (a, b) => {
    console.log("(Unhandled Promise Rejection)", a, b);
  }),
    process.on("uncaughtException", a => {
      console.error("(Uncaught Exception)", a),
        require("fs").writeFileSync("/Volumes/RamDisk/" + Date.now(), a);
    }),
    (u.schedulingPolicy = u.SCHED_RR);
  const x = s.cpus().length,
    y = x - 1;
  let z,
    A = [],
    B = [];
  const C = new WeakMap(),
    D = new w(),
    E = {};
  (global.childrenInfos = C),
    (global.selfManagedMap = D),
    (global.getPrimeChildren = () => A),
    (global.getChildren = () => B),
    (global.tasksMap = E);
  const F = {
    verbose: !0,
    respawn: !1,
    workerListener(a, b) {
      "object" == typeof a && ("initchildsuccess" === a.type && b && b(), r(a));
    },
    onDisconnect(a) {
      try {
        C.delete(a);
      } catch (a) {}
    }
  };
  (function() {
    u.isMaster ? c() : "prime" === process.env.workerIdentifier ? d() : e();
  })();
}
