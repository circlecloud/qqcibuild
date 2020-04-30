module.exports = {
  info: (...args) => {
    console.info.apply(null, args);
  },
  log: (...args) => {
    console.log.apply(null, args);
  },
  warn: (...args) => {
    console.warn.apply(null, args);
  },
  error: (...args) => {
    console.error.apply(null, args);
  },
}