const axios = require('axios')
var ImplementCommand = null;

var Tokens = {};

function Enact(output,callback,errorFunction){
  const ls = spawn(ImplementCommand, [output]);
  var rawData = "";
  ls.stdout.on('data', (data) => {
    rawData += data;
  });
  ls.stderr.on('error', (data) => {
      console.log("ERROR!");
      errorFunction(data);
  }); 
  ls.on('error', (error) =>{
      console.log("ERROR!")
      errorFunction(error);
  });
  if(rawData.includes("success"))
    callback("success");
}
module.exports.Tokens = Tokens
module.exports.Enact = Enact