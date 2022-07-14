const path = require('path');
const open = require("open");
const axios = require('axios')
const ejs = require('ejs');
var fs = require("fs");
const { post } = require('jquery');
const { eventNames } = require('process');
const express = require('express')
var cors = require('cors');
const { start } = require('repl');

//Import Modules
const SPICE = require("./modules/spice");
const Graph = require("./modules/graph");
const Labs = require("./modules/labs");
const Functions = require("./modules/functions")
const Actions = require("./actions.js");


const ws = express()
ws.use(cors())
const port = 3001
var bodyParser = require('body-parser');
ws.use(bodyParser.json({limit: "50mb"}));
ws.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
ws.set('views', path.join(__dirname, 'views'));
ws.set('view engine', 'ejs');
ws.use(express.static(path.join(__dirname, 'public')));
ws.use(express.static(path.join(__dirname, 'node_modules')));

/* UNCOMMENT FOR MAC
const ENVIRONMENT = "Mac";
const DIRSLASH="/"
const LABDIR="Labs"
const SAVEDIR="/Users/jackrenshaw/Desktop/ELI-Saved"
 */
/* UNCOMMENT FOR PRODUCTION */
const ENVIRONMENT = "Prod";
const DIRSLASH="\\"
const LABDIR="C:\\Elec2133New\\ELI-LabRun\\labs"
const SAVEDIR="C:\\Elec2133New\\Saved"
/* */

let CourseIndex = 0;

function implementCircuit(params,callback,errorCallback){
  console.log(params);
  console.log(params.token);
  if(params.token == ACTIONTOKEN)
    Actions.Implement(params.output,callback,errorCallback)
  else if(Actions.Tokens.hasOwnProperty(params.token))
    Actions.Implement(params.output,callback,errorCallback)
  else
    errorCallback("invalid token")
}


if(ENVIRONMENT == "Prod"){
  Actions.ImplementCommand.BINDIR = "C:\\ELEC2133New\\ELI-LabRun\\bin"
  SPICE.SpiceCommand = Actions.ImplementCommand.BINDIR+DIRSLASH+"ngspice_con.exe";
}else if(ENVIRONMENT == "Testing"){
  const DIRSLASH = "\\"
  Actions.ImplementCommand.BINDIR = "C:\\Users\\Optiplex7090\\Desktop\\ELEC2133\\ELI-LabRun\\bin"
  SPICE.SpiceCommand = Actions.ImplementCommand.BINDIR+DIRSLASH+"ngspice_con.exe";
}else{
  Labs.DIRSLASH = DIRSLASH;
  Actions.ImplementCommand.BINDIR = ""
  Actions.ImplementCommand.DIRSLASH = ""
  SPICE.SpiceCommand = "ngspice";
  Actions.ImplementCommand.Analog = "echo";
  Actions.ImplementCommand.Digital = "echo";
}

Labs.Creative = true;
Labs.Procedural = false;
Labs.Direct = true;
Labs.Framework = true;
const PANETOKEN = "ELEC2133";
const ACTIONTOKEN = "ELEC2133";

let SPICEEnabled = false;

let builds = [];
let StartupErrors = [];

ws.get("/l/",(req,res) =>{
  res.render("select",{labs:Labs.Courses[CourseIndex].Labs,actions:Actions.Actions})
})

ws.get("/api/:c",function(req,res,next){
  console.log("Recieved downsync request");
  if(builds.hasOwnProperty(req.params.c))
    res.send(JSON.stringify(builds[req.params.c]))
  else
    res.status(400).send({});
})

ws.post("/api/:c",function(req,res,next){
  console.log("Recieved upsync request");
  builds[req.params.c] = JSON.parse(req.body.build);
  res.status(200).send(JSON.stringify(builds[req.params.c]));
})

ws.get("/b/:c",(req,res) =>{
  let build = {export:null};
  let buildset = false;
  console.log(builds);
  if(builds.hasOwnProperty(req.params.c)){
    build = builds[req.params.c];
    buildset = true;
  }
  console.log(build);
  res.render('lab', {
    page:{next:null,prev:null},
    build:build,
    BASE:""
  });
})

ws.post("/b/:code",(req,res) =>{
  let page = JSON.parse(req.body.page);
  var found = false;
  console.log(page);
  if(page.hasOwnProperty('lab') && page.hasOwnProperty('part') && page.hasOwnProperty('section'))
    for(const l of Labs.Courses[CourseIndex].Labs)
      if(l.Name == page.lab)
        for(const p of l.Parts)
          if(p.Name == page.part)
              for(var si=0;si<p.Sections.length;si++){
                let Export = null;
                console.log(p.Sections[si].Compiled)
                if(fs.existsSync(p.Sections[si].Compiled))
                  Export = fs.readFileSync(p.Sections[si].Compiled,"utf-8");
                else
                  console.log("No Compiled HTML File!");
                console.log(Export);
                const s = p.Sections[si];
                if(s.Name == page.section){
                  var prev = null;
                  var next = null;
                  if(si>1)
                    prev = {lab:l.Name,part:p.Name,section:p.Sections[si-1].Name};
                  if(si<(p.Sections.length-1) && si !=0)
                    next = {lab:l.Name,part:p.Name,section:p.Sections[si+1].Name};
                  console.log("Found Lab!");
                  found = true;
                  console.log("Implementing Pre Actions");
                  res.render("lab",{build:{export:Export},page:{prev:prev,next:next},BASE:""})
                  Actions.Implement(s.Output.Pre,function(response){
                      console.log(response);
                    },function(error){
                      console.log(error);
                    });
                  };
              }
})

ws.get('/labs.json', (req, res) => {
  res.send(Labs.Courses);
})

ws.get('/implement', (req, res) => {
  let responses = [];
  let errorSent = false;
  console.log(req.query);
  implementCircuit(req.query,function(response){ 
    responses.push(response);
    console.log(responses);
    if(responses.length == 4)
      res.send(responses);
  },function(error){
    if(!errorSent){
      errorSent = true;
      res.status(400).send(error);
    }
    console.log("Error:"+error)
  });
})

ws.post("/simulate", (req,res) =>{
  console.log("Simulating Circuit")
  console.log(req.body.circuit)
  let response = {
    rawData:null,
    multimeter:null,
    simulate:null
  }
  let ErrorSent = false;
  SPICE.ImageSimulate(
    req.body.circuit,
    function(svg,data){
      console.log("returning simuation image");
      response.simulate = svg;
      if(response.multimeter && response.simulate && response.rawData)
        res.send(response);
    },function(rawData){
      console.log("Returning Raw Data");
      response.rawData = rawData;
      if(response.multimeter && response.simulate && response.rawData)
        res.send(response);
    },function(multimeter){
      response.multimeter = multimeter;
      if(response.multimeter && response.simulate && response.rawData)
        res.send(response);
    },function(error){
      console.log("Error:")
      console.log(error)
      if(!ErrorSent)
        res.status(400).send(error)
    });
})

ws.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

SPICE.test(async function(){
  Labs.setLabs(LABDIR,function(debugLine){
    console.log("SPICE is locally available. Assume we are running on a Lab Machine");
    SPICEEnabled = true;
    console.log(debugLine);
    open("https://elec2133-unsw-eli.azurewebsites.net/l/")
  },function(error){
    StartupErrors.push("There was an error Compiling the Laboratories")
  })
},function(){
  console.log("SPICE is not locally available. We will assume we are not running on a lab machine");
  Labs.PreSimulate = false;
  Labs.setLabs(LABDIR,function(debugLine){
    console.log(debugLine);
    open("https://elec2133-unsw-eli.azurewebsites.net/l/")
  },function(error){
    StartupErrors.push("There was an error Compiling the Laboratories")
  })
});

module.exports = ws;

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
