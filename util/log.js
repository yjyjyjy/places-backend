const dlog = message => {
  console.log("\x1b[33m", message);
  console.log("\x1b[0m")  
}

module.exports = dlog;