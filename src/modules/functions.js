var fs = require("fs");
var path = require('path');
var crypto = require('crypto');
function formatBytes(a,b=2,k=1024){with(Math){let d=floor(log(a)/log(k));return 0==a?"0 Bytes":parseFloat((a/pow(k,d)).toFixed(max(0,b)))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}}

const SALT = "";


//function recursively walks through directory and produces array of files;
var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

function generateToken(Email,Password){
  return crypto.createHash("sha256").update((Email+Password+SALT), "binary").digest("base64");
}

function generateActionToken(){
  return crypto.createHash("sha256").update(Date.now().toString(), "binary").digest("base64");
}

module.exports.formatBytes = formatBytes;
module.exports.walk = walk;
module.exports.generateToken = generateToken;
module.exports.generateActionToken = generateActionToken;
module.exports.validateToken = validateToken;
module.exports.SALT = SALT;