const axios = require('axios')
var exec = require('child_process').exec,child;
var ImplementCommand = {
  Digital:"\"src/bin/dummy\"",
  Analog:"\"src/bin/dummy\""
};

var Tokens = {};

function EnactDigital(pin,value,callback,errorFunction){
  console.log("Digital Output at Pin");
  if(value == false)
    value = '0'
  else if(value == true)
    value = '1'
  else
    errorFunction("Digital Pin Value Error");
  child = exec((ImplementCommand.Digital+" "+pin+" "+value),
  function (error, stdout, stderr) {
    if(error)
      errorFunction(error)
    else if(stderr)
      errorFunction(stderr)
    else
      callback(stdout);
  });
}

function EnactAnalog(pin,value,callback,errorFunction){
  console.log("Analog Output at pin")
  if(value > 5 || value < 0)
    errorFunction("Analog Value Error");
  child = exec((ImplementCommand.Analog+" "+pin+" "+value),
  function (error, stdout, stderr) {
    if(error)
      errorFunction(error)
    else if(stderr)
      errorFunction(stderr)
    else
      callback(stdout);
  });
}

function Enact(output,callback,errorFunction){
  for(var o=0;o<output.length;o++)
    if(output[o].type == 'digital')
      EnactDigital(o,output[o].value,callback,errorFunction)
    else if(output[o].type == 'analog')
      EnactAnalog(o,output[o].value,callback,errorFunction)
    else
      errorFunction("Output Type Error");
}

module.exports.ImplementCommand = ImplementCommand
module.exports.Tokens = Tokens
module.exports.Enact = Enact