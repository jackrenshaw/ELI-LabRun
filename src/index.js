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

SPICE.SpiceCommand = "ngspice";
Actions.ImplementCommand.Analog = "echo";
Actions.ImplementCommand.Digital = "echo";

const isMac = process.platform === 'darwin'
const BASE = 'https://unsw-eli.herokuapp.com/'

function login(form,callback,errorCallback){
  axios
  .post(BASE+'auth/login',form)
  .then(res => {
    callback(res.data);
  })
  .catch(error => {
    errorCallback(error)
  })
}

function startup(event,callback){
  SPICE.test(async function(){
    event.reply('startup-reply', "SPICE Works Locally<br>")
    Labs.setLabs("src/labs",function(debugLine){
      event.reply('startup-reply', (debugLine+"<br>"))
    })
    setTimeout(callback, 5000);
  },function(){
    event.reply('startup-reply', "SPICE doesn't work Locally. ELI can not run!")
  }) 
}

var openGraphSim = function(){
  const graphWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/graphsim-preload.js')
  }
  });
  graphWindow.webContents.openDevTools();
  graphWindow.loadFile(path.join(__dirname, 'views/graphsim.ejs'))
}

//This needs more validation (for params at a minimum)
//We also need to validate the actions object at some point
function implementCircuit(params,callback,errorCallback){
  console.log(params);
  console.log(params.token);
  if(params.token == "password")
    Actions.Implement(params.output,callback,errorCallback)
  else if(Actions.Tokens.hasOwnProperty(params.token))
    Actions.Implement(params.output,callback,errorCallback)
  else
    errorCallback("invalid token")
}

function circuitValidate(params,callback,errorCallback){
  console.log("validating the circuit");
  var found = false;
  console.log(params);
  for(var l of Labs.Labs)
    if(l.Name == params.lab){
      for(var p of l.Parts)
        if(p.Name == params.part){
          if(params.section){
            console.log("Validating a circuit with a section")
            for(var s of p.Sections){
              if(s.Name == params.section){
                validCircuit = function(res){
                  console.log("Circuit is valid, producing action token");
                  const token = Functions.generateActionToken();
                  Actions.Tokens[token] = {page:params,output:s.Output}
                  callback({token:token,output:s.Output,res:res})
                  console.log(Actions.Tokens)
                }
                SPICE.ValidateCircuit(params.circuit,s.Solution,validCircuit,errorCallback)
                found = true;
            }}
          }else{
            console.log("validating a circuit without a section")
            var t=0;
            for(var i=0;i<p.Implementations.length;i++){
              allError = function(res){
                t++;
                if(t == i)
                  errorCallback("No Valid Lab Found");
              }
              validCircuit = function(res){
                console.log("Circuit is valid, producing action token");
                const token = Functions.generateActionToken();
                Actions.Tokens[token] = {page:params,output:p.Implementations[i].Output}
                callback({token:token,output:p.Implementations[i].Output,res:res})
                console.log(Actions.Tokens)
              }
              SPICE.ValidateCircuit(params.circuit,s.Solution,validCircuit,allError)
            } 
          }
        }
    }
  if(!found){
    console.log("Lab Doesn't Exist");
    errorCallback("The Laboratory Provided Doesn't Exist");
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  //Create the lab window
  var labWindow = new BrowserWindow({
    show:false,
    width: 1500,
    height: 900,
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


  labWindow.on('close',function(event){
    console.log("attempting to close lab window");
    event.preventDefault();
    labWindow.hide();
  })
  
  openGraphSim();

  var openPane = function(page,callback,errorCallback){
    console.log(page);
    var found = false;
    if(page.hasOwnProperty('lab') && page.hasOwnProperty('part') && page.hasOwnProperty('section'))
      for(var l of Labs.Labs)
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
              paneWindow.webContents.openDevTools();
              const ejse = require('ejs-electron')
              .data({part:p})
              .options('debug', false)
              paneWindow.loadFile(path.join(__dirname, 'views/pane.ejs'));
              callback("success");
            }
  if(!found){
    console.log("Lab doesn't exist?")
    errorCallback("Page not Found");
  }
  }

  var openLab = function(page,preload,callback,errorCallback,labWindow){
    console.log(page);
    console.log(preload);
    var found = false;
    if(page.hasOwnProperty('lab') && page.hasOwnProperty('part') && page.hasOwnProperty('section'))
      for(const l of Labs.Labs)
        if(l.Name == page.lab)
          for(const p of l.Parts)
            if(p.Name == page.part)
                for(var si=0;si<p.Sections.length;si++){
                  const s = p.Sections[si];
                  if(s.Name == page.section){
                    var prev = null;
                    var next = null;
                    if(si>0)
                      prev = {lab:l.Name,part:p.Name,section:p.Sections[si-1].Name};
                    if(si<(p.Sections.length-1))
                      next = {lab:l.Name,part:p.Name,section:p.Sections[si+1].Name};
                    console.log("Found Lab!");
                    found = true;
                      console.log("Implementing Pre Actions");
                      Actions.Implement(s.Output.Pre,function(response){
                        labWindow.webContents.openDevTools();
                        const ejse = require('ejs-electron')
                        .data({section:s,part:p,page:{lab:page.lab,part:page.part,section:page.section,prev:prev,next:next},preload:preload})
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
    fs.writeFileSync("src/labs/labs.json",JSON.stringify(Labs.Labs))
    const ejse = require('ejs-electron')
    .data({labs:Labs.Labs,actions:Actions.Actions})
    .options('debug', false)
    mainWindow.loadFile(path.join(__dirname, 'views/select.ejs'));
  }
  mainWindow.webContents.openDevTools();
  ipcMain.on('getCompletions', (event,page) => {
    getCompletions(page,function(response){ event.reply('completion-reply', response)},function(error){event.reply('completion-error', error)});
  })
  ipcMain.on('graph', (event,params) => {
    Graph("Function",params.signals,params.xlabel,params.ylabel,function(svg){event.reply('graph-reply', svg)},function(error){event.reply('graph-reply', error)});
  })
  ipcMain.on('save',(event,params) =>{
    console.log(params)
    fs.mkdir("save/"+params.page.lab+"/"+params.page.part,{ recursive: true },function(){
      fs.writeFileSync("save/"+params.page.lab+"/"+params.page.part+"/"+Date.now()+".json",JSON.stringify(params.preload));
      event.reply('save-reply','success')
    })
  })
  ipcMain.on('getload',(event,params) =>{
    console.log(params)
    event.reply('getload-reply',Labs.getSaved(params.page.lab,params.page.part));
  })
  ipcMain.on('load',(event,params) =>{
    console.log(params)
    openLab(params.page,JSON.parse(fs.readFileSync("save/"+params.page.lab+"/"+params.page.part+"/"+params.file)),function(response){ event.reply('load-reply', response)},function(error){event.reply('load-error', 'error')},labWindow)
  })
  ipcMain.on('simulate', (event,params) => {
    console.log("Simualting Circuit");
    SPICE.ImageSimulate(
      params.circuit,
      function(svg){
        console.log("returning simuation image");
        event.reply('simulate-reply',svg)
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
  ipcMain.on('validate', (event,params) => {
      circuitValidate(params,
        function(token){ console.log("success");event.reply('validate-reply', token)},
        function(error){console.log(error); event.reply('validate-error', error)}
      );
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
    openPane(params.page,function(response){ event.reply('openPane-reply', response)},function(error){event.reply('openPane-error', error)});
  })
  ipcMain.on('startup', (event,page) => {
    startup(event,loadView);
  })

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
