const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios')
const ejse = require('ejs-electron')
var fs = require("fs");
const { post } = require('jquery');

const SPICE = require("./modules/spice");
const Graph = require("./modules/graph");
const Labs = require("./modules/labs");
const Functions = require("./modules/functions")
const Actions = require("./actions.js");
const { eventNames } = require('process');


const ENVIRONMENT = "Mac";
const DIRSLASH="/"
const LABDIR="Labs"
const SAVEDIR="/Users/jackrenshaw/Desktop/ELI-Saved"
/* UNCOMMENT FOR PRODUCTION
const ENVIRONMENT = "Prod";
const DIRSLASH="\\"
const LABDIR="C:\\Elec2133New\\ELI-LabRun\\labs"
const SAVEDIR="C:\\Elec2133New\\Saved"
*/

let CourseIndex = 0;


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
var HALTSTARTUP = false;

const isMac = process.platform === 'darwin'

function startup(event,callback){
  SPICE.test(async function(){
    event.reply('startup-reply', "SPICE Works Locally<br>")
    Labs.setLabs(LABDIR,function(debugLine){
      event.reply('startup-reply', (debugLine+"<br>"))
    },function(error){
      HALTSTARTUP = true;
      console.log("Lab Parse error")
      event.reply('startup-error', (error+"<br>"))
    })
    event.reply("startup-coursechoice",Labs.Courses);
    //setTimeout(callback, 5000);
  },function(){
    event.reply('startup-reply', "SPICE doesn't work Locally. ELI can not run!")
  }) 
}

//This needs more validation (for params at a minimum)
//We also need to validate the actions object at some point
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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

app.on('window-all-closed', () => {
  app.quit()
})

const createWindow = () => {
  //Create the lab window
  var labWindow = new BrowserWindow({
    show:false,
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/lab-preload.js')
    }
  });
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/preload.js')
  }
  });
  const graphWindow = new BrowserWindow({
    show:false,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/graphsim-preload.js')
  }
  });

  labWindow.on('close',function(event){
    console.log("attempting to close lab window");
    Actions.Restore();
    event.preventDefault();
    labWindow.hide();
  })

  mainWindow.on('close',function(event){
    app.quit();
  })

  graphWindow.on('close',function(event){
    console.log("attempting to close lab window");
    event.preventDefault();
    graphWindow.hide();
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
  
  var openPane = function(token,page,callback,errorCallback){
    console.log(token)
    console.log(PANETOKEN)
    console.log(page);
    var found = false;
    if(page.hasOwnProperty('lab') && page.hasOwnProperty('part') && page.hasOwnProperty('section') && token == PANETOKEN)
        for(var l of Labs.Courses[CourseIndex].Labs)
        if(l.Name == page.lab)
          for(var p of l.Parts)
            if(p.Name == page.part){
              console.log("Found Lab!");
              found = true;
              const paneWindow = new BrowserWindow({
                width: 1500,
                height: 900,
                webPreferences: {
                  nodeIntegration: true,
                  preload: path.join(__dirname, 'preload/pane-preload.js')
                }
              });
              //paneWindow.webContents.openDevTools();
              const ejse = require('ejs-electron')
              .data({part:p})
              .options('debug', false)
              paneWindow.loadFile(path.join(__dirname, 'views/pane.ejs'));
              callback("success");
            }
  if(!found){
    console.log("Lab doesn't exist?")
    errorCallback("Page not Found or wrong password");
  }
  }

  var openLab = function(page,preload,callback,errorCallback,labWindow){
    console.log(page);
    console.log(preload);
    var found = false;
    if(page.hasOwnProperty('lab') && page.hasOwnProperty('part') && page.hasOwnProperty('section'))
      for(const l of Labs.Courses[CourseIndex].Labs)
        if(l.Name == page.lab)
          for(const p of l.Parts)
            if(p.Name == page.part)
                for(var si=0;si<p.Sections.length;si++){
                  var Framework = null;
                  console.log(p.FrameworkFile)
                  if(fs.existsSync(p.FrameworkFile))
                    Framework = fs.readFileSync(p.FrameworkFile,"utf-8");
                  else
                    console.log("No Framework File!");
                  console.log(Framework);
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
                      Actions.Implement(s.Output.Pre,function(response){
                        //labWindow.webContents.openDevTools();
                        const ejse = require('ejs-electron')
                        .data({meta:{Creative:Labs.Creative,Procedural:Labs.Procedural,Direct:Labs.Direct},section:s,part:p,page:{lab:page.lab,part:page.part,section:page.section,prev:prev,next:next},preload:preload,Framework:Framework})
                        .options('debug', false)
                        labWindow.loadFile(path.join(__dirname, 'views/lab.ejs'));
                        labWindow.show();
                        callback("success");
                      },function(error){
                        errorCallback(error);
                      });
                    }
                  }
  if(!found){
    console.log("Lab doesn't exist?")
    errorCallback("Page not Found");
  }
  }

  var loading = function(){
      const ejse = require('ejs-electron')
      .options('debug', false)
      mainWindow.loadFile(path.join(__dirname, 'views/index.ejs'));
  }
  loading();

  var loadView = function(){
    if(!HALTSTARTUP){
      console.log(Labs.Courses[CourseIndex].Labs);
    const ejse = require('ejs-electron')
    .data({labs:Labs.Courses[CourseIndex].Labs,actions:Actions.Actions})
    .options('debug', false)
    mainWindow.loadFile(path.join(__dirname, 'views/select.ejs'));
    }
  }
  //BEGIN ipc SET
  ipcMain.on('graph', (event,params) => {
    Graph("Function",params.signals,params.xlabel,params.ylabel,function(svg){event.reply('graph-reply', svg)},function(error){event.reply('graph-reply', error)});
  })
  ipcMain.on('save',(event,params) =>{
    console.log(params)
    fs.mkdir(SAVEDIR+DIRSLASH+params.page.lab+DIRSLASH+params.page.part,{ recursive: true },function(){
      fs.writeFileSync(SAVEDIR+DIRSLASH+params.page.lab+DIRSLASH+params.page.part+DIRSLASH+Date.now()+".json",JSON.stringify(params.preload));
      event.reply('save-reply','success')
    })
  })
  ipcMain.on('set-course',(event,params) =>{
    CourseIndex = params;
    loadView();
  })
  ipcMain.on('getload',(event,params) =>{
    console.log(params)
    event.reply('getload-reply',Labs.getSaved(SAVEDIR,params.page.lab,params.page.part));
  })
  ipcMain.on('load',(event,params) =>{
    console.log(params)
    if(params.file)
      openLab(params.page,JSON.parse(fs.readFileSync(SAVEDIR+DIRSLASH+params.page.lab+DIRSLASH+params.page.part+DIRSLASH+params.file)),function(response){ event.reply('load-reply', response)},function(error){event.reply('load-error', 'error')},labWindow)
    else if(params.data)
      openLab(params.page,params.data,function(response){ event.reply('load-reply', response)},function(error){event.reply('load-error', 'error')},labWindow)
  })
  ipcMain.on('simulate', (event,params) => {
    console.log("Simualting Circuit");
    SPICE.ImageSimulate(
      params.circuit,
      function(svg,data){
        console.log("returning simuation image");
        event.reply('simulate-reply',svg)
        event.reply('simulatedata-reply',data)
      },function(rawData){
        console.log("Returning Raw Data");
        console.log(rawData);
        event.reply('rawdata-reply',rawData)
      },function(multimeter){
        console.log("returning mutlimeter response");
        console.log(multimeter);
        event.reply('multimeter-reply',multimeter)
      },function(error){
        console.log("simulation error:")
        console.log(error);
        event.reply('simulate-error',error)
      });
  })
  ipcMain.on('openGraphWindow', (event,params) => {
    console.log("Opening the Graph Window");
    graphWindow.show();
  })
  ipcMain.on('implement', (event,params) => {
    console.log("Implementing the Circuit");
    implementCircuit(params,function(response){ event.reply('implement-reply', response)},function(error){event.reply('implement-error',error)});
  })
  ipcMain.on('openLab', (event,params) => {
    console.log("Opening a new lab");
    console.log(params.preload);
    openLab(params.page,params.preload,function(response){ event.reply('openLab-reply', response)},function(error){event.reply('openLab-error', error)},labWindow);
  })
  ipcMain.on('openPane', (event,params) => {
    console.log("Opening a new pane");
    console.log(params);
    openPane(params.token,params.page,function(response){ event.reply('openPane-reply', response)},function(error){event.reply('openPane-error', error)});
  })
  ipcMain.on('startup', (event,page) => {
    startup(event,loadView);
  })
  //END ipc SET
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


const express = require('express')
var cors = require('cors');
const { start } = require('repl');
const ws = express()
ws.use(cors())
const port = 3001

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

ws.get("/simulate", (req,res) =>{
  console.log("Simulating Circuit")
  console.log(req.query.circuit)
  let response = {
    rawData:null,
    multimeter:null,
    simulate:null
  }
  let ErrorSent = false;
  SPICE.ImageSimulate(
    req.query.circuit,
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
