const axios = require('axios')
var exec = require('child_process').exec,child;
var ImplementCommand = {
  Digital:"\"src/bin/dummy\"",
  Analog:"\"src/bin/dummy\""
};

var Tokens = {};

function ImplementDigital(pin,value,callback,errorFunction){
  console.log("Digital Output at Pin");
  if(value == false)
    value = '0'
  else if(value == true)
    value = '1'
  else
    errorFunction("Digital Pin Value Error");
  console.log("PIN:"+pin+"VALUE:"+value)
  child = exec((ImplementCommand.Digital+" "+pin+" "+value),
  function (error, stdout, stderr) {
    if(error)
      errorFunction(error)
    else if(stderr)
      errorFunction(stderr)
    else{
      callback(stdout);
      console.log(stdout);
    }
  });
}

function ImplementAnalog(pin,value,callback,errorFunction){
  console.log("Analog Output at pin")
  if(value > 5 || value < 0)
    errorFunction("Analog Value Error");
  child = exec((ImplementCommand.Analog+" "+pin+" "+value),
  function (error, stdout, stderr) {
    if(error)
      errorFunction(error)
    else if(stderr)
      errorFunction(stderr)
    else{
      callback(stdout);
      console.log(stdout);
    }
  });
}

function Implement(output,callback,errorFunction){
  console.log("Enacting Circuit")
  for(var o=0;o<output.length;o++)
    if(output[o].type == 'digital')
      ImplementDigital(o,output[o].value,callback,errorFunction)
    else if(output[o].type == 'analog')
      ImplementAnalog(o,output[o].value,callback,errorFunction)
    else
      errorFunction("Output Type Error");
}

module.exports.ImplementCommand = ImplementCommand
module.exports.Tokens = Tokens
module.exports.Implement = Implement