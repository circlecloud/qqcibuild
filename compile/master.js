const cluster = require('cluster');
const os = require('os');

function processMaster(config) {
  const workerCount = parseInt(config.count || process.env.WORKER_COUNT);
  const count = 0 < workerCount ? Math.min(workerCount, os.cpus().length) : os.cpus().length;
  let respawn = 'undefined' == typeof config.respawn || !!config.respawn;
  const outputMsg = config.outputStream && 'function' == typeof config.outputStream.write ? config.outputStream.write : console.log;
  const workers = config.workers || [];
  if (config.verbose) {
    outputMsg('Master started on pid ' + process.pid + ', forking ' + count + ' processes of type ' + config.identifier);
  }

  for (let b = 0, d = count; 0 <= d ? b < d : b > d; 0 <= d ? ++b : --b) {
    let env = Object.assign({}, process.env);
    env.workerIdentifier = config.identifier;
    const worker = cluster.fork(env);
    if ('function' == typeof config.workerListener) {
      worker.on('message', config.workerListener)
    }
    workers.push(worker)
  }
  cluster.on('disconnect', (worker) => {
    if (config.verbose) {
      outputMsg(worker.process.pid + ' disconnect');
    }
    const index = workers.indexOf(worker);
    if (index > -1) {
      workers.splice(index, 1)
    }
    if (config.onDisconnect) {
      config.onDisconnect(worker)
    }
  })
  cluster.on('exit', (worker, code, signal) => {
    if (config.verbose) {
      outputMsg(worker.process.pid + ' died with ' + (signal || 'exit code ' + code) + (respawn ? ', restarting' : ''))
    }
    const i = workers.indexOf(worker);
    if (i > -1) {
      workers.splice(i, 1)
    }
    if (config.onDisconnect) {
      config.onDisconnect(worker)
    }
    if (respawn) {
      let env = Object.assign({}, process.env);
      worker = cluster.fork(env);
      if ('function' == typeof config.workerListener) {
        worker.on('message', config.workerListener)
      }
      workers.push(worker)
      return
    }
  })
  process.on('SIGTERM', () => {
    respawn = false;
    if (config.verbose) {
      outputMsg('QUIT received, will exit once all workers have finished current requests');
    }
    const list = [];
    for (let i = 0, len = workers.length; i < len; i++) {
      const worker = workers[i];
      list.push(cluster.send('quit'));
      setTimeout(() => {
        try {
          cluster.kill('SIGTERM')
        } catch (error) {}
      }, 1000)
    }
    setTimeout(() => {
      try {
        process.exit()
      } catch (error) {}
    }, 5 * 1000)
    return list
  })
  return
}

function processWorker(handle, worker) {
  const worker1 = handle(worker);
  if (worker1) {
    if ('function' == typeof worker1.on) {
      worker1.on('close', () => process.exit())
    }
    if ('function' == typeof c.close) {
      process.on('message', (msg) => {
        if (msg === 'quit') {
          return worker1.close()
        } else {
          return null
        }
      })
    }
  } else {
    return null
  }
}

module.exports = (handle = () => {}, config = {}) => {
  Date.now();
  if (cluster.isMaster) {
    return processMaster(config)
  } else {
    return processWorker(handle, cluster.worker)
  }
}
