const axios = require('axios')
var exec = require('child_process').exec,child;
var ImplementCommand = {
  Digital:"\"src/bin/test.exe\"",
  Analog:"\"src/bin/test1.exe\""
};

var Tokens = {};

function ImplementDigital(value,callback,errorFunction){
  console.log("Digital Output Value:"+value);
  child = exec((ImplementCommand.Digital+" "+value),
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
  console.log("Analog Output:"+value+" at pin:"+pin);
  if(value > 5 || value < 0)
    errorFunction("Analog Value Error");
  child = exec((ImplementCommand.Analog+" "+pin.toString()+" "+value.toString()),
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
  var digitalString = 0;
  for(var o=0;o<output.Digital.length;o++)
      if(output.Digital[o] == true)
        digitalString = digitalString+parseInt(Math.pow(2,o));
  ImplementDigital(digitalString.toString(16),callback,errorFunction);
  for(var o=0;o<output.Analog.length;o++)
    ImplementAnalog(o,output.Analog[o],callback,errorFunction);
}

ImplementDigital("00",console.log,console.log);
ImplementAnalog("0","0.0",console.log,console.log);
ImplementAnalog("1","0.0",console.log,console.log);

module.exports.ImplementCommand = ImplementCommand
module.exports.Tokens = Tokens
module.exports.Implement = Implement