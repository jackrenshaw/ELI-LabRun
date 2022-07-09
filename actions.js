const axios = require('axios')
var exec = require('child_process').exec,child;

var ImplementCommand = {
  BINDIR:"",
  Digital:"digitalWrite.exe",
  Analog:"analogWriteNew.exe",
  DIRSLASH:"\\"
};

var Tokens = {};

function ImplementDigital(port,value,callback,errorFunction){
  console.log("Digital Output:"+value+" at pin:"+port);
  child = exec(("\""+ImplementCommand.BINDIR+ImplementCommand.DIRSLASH+ImplementCommand.Digital+"\" "+port+" "+value),
  function (error, stdout, stderr) {
    console.log(error)
    console.log(stderr)
    console.log(stdout)
    if(error)
      errorFunction(error)
    else if(stderr)
      errorFunction(stderr)
    else{
      callback({type:"Digital",port:port,value:value,response:stdout});
      console.log(stdout);
    }
  });
}

function ImplementAnalog(port,value,callback,errorFunction){
  console.log("Analog Output:"+value+" at pin:"+port);
  if(value > 5 || value < 0)
    errorFunction("Analog Value Error");
  child = exec(("\""+ImplementCommand.BINDIR+ImplementCommand.DIRSLASH+ImplementCommand.Analog+"\" "+port.toString()+" "+value.toString()),
  function (error, stdout, stderr) {
    console.log(error)
    console.log(stderr)
    console.log(stdout)
    if(error)
      errorFunction(error)
    else if(stderr)
      errorFunction(stderr)
    else{
      callback({type:"Analog",port:port,value:value,response:stdout});
      console.log(stdout);
    }
  });
}

function Implement(output,callback,errorFunction){
  console.log("Enacting Circuit")
  var digitalString1 = 0;
  for(var o=0;o<output.Digital[0].length;o++)
      if(output.Digital[0][o] == true)
        digitalString1 = digitalString1+parseInt(Math.pow(2,o));
  ImplementDigital('0',digitalString1.toString(16),callback,errorFunction);
  var digitalString2 = 0;
  for(var o=0;o<output.Digital[1].length;o++)
      if(output.Digital[1][o] == true)
        digitalString2 = digitalString2+parseInt(Math.pow(2,o));
  ImplementDigital('1',digitalString2.toString(16),callback,errorFunction);
  for(var o=0;o<output.Analog.length;o++)
    ImplementAnalog(o,output.Analog[o],callback,errorFunction);
}

function Restore(){
  ImplementDigital("0","00",console.log,console.log);
  ImplementDigital("0","00",console.log,console.log);
  ImplementAnalog("0","0.0",console.log,console.log);
  ImplementAnalog("1","0.0",console.log,console.log);
}


module.exports.Restore = Restore
module.exports.ImplementCommand = ImplementCommand
module.exports.Tokens = Tokens
module.exports.Implement = Implement