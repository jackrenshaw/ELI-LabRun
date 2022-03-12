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

var openGraph = function(){
  const graphWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/graph-preload.js')
  }
  });
  graphWindow.webContents.openDevTools();
  graphWindow.loadFile(path.join(__dirname, 'views/graph.ejs'))
}

var openSimulation = function(){
  const simWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/sim-preload.js')
  }
  });
  simWindow.webContents.openDevTools();
  simWindow.loadFile(path.join(__dirname, 'views/sim.ejs'))
}

//This needs more validation (for params at a minimum)
//We also need to validate the actions object at some point
function implementCircuit(params,callback,errorCallback){
  console.log("Implementing the Circuit");
  callback("hello world")
}

function circuitValidate(params,callback,errorCallback){
  console.log("validating the circuit");
  var found = false;
  console.log(params);
  for(var l of Labs.Labs)
    if(l.Name == params.lab){
      console.log("in lab")
      for(var p of l.Parts)
        if(p.Name == params.part){
          console.log("in part")
          for(var s of p.Sections)
            if(s.Name == params.section){
              console.log("in section");
              console.log("validating circuit");
              validCircuit = function(res){
                console.log("Circuit is valid, producing action token");
                const token = Functions.generateActionToken();
                Actions.Tokens[token] = {page:params}
                callback({token:token,res:res})
                console.log(Actions.Tokens)
              }
              SPICE.ValidateCircuit(params.circuit,s.Solution,null,null,validCircuit,errorCallback)
              found = true;
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
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload/preload.js')
  }
  });

  var openLab = function(page,callback,errorCallback){
    console.log(page);
    var found = false;
    if(page.hasOwnProperty('lab') && page.hasOwnProperty('part') && page.hasOwnProperty('section'))
      for(var l of Labs.Labs)
        if(l.Name == page.lab)
          for(var p of l.Parts)
            if(p.Name == page.part)
                for(var si=0;si<p.Sections.length;si++){
                  var s = p.Sections[si];
                  if(s.Name == page.section){
                    var prev = null;
                    var next = null;
                    if(si>0)
                      prev = {lab:l.Name,part:p.Name,section:p.Sections[si-1].Name};
                    if(si<(p.Sections.length-1))
                      next = {lab:l.Name,part:p.Name,section:p.Sections[si+1].Name};
                    console.log("Found Lab!");
                    found = true;
                    const labWindow = new BrowserWindow({
                        width: 1200,
                        height: 800,
                        webPreferences: {
                          nodeIntegration: true,
                          preload: path.join(__dirname, 'preload/lab-preload.js')
                      }
                      });
                      labWindow.webContents.openDevTools();
                      var reqURL = BASE+'l/'+page.lab+'/'+page.part+'/'+s.Name
                      const ejse = require('ejs-electron')
                      .data({section:s,part:p,page:{lab:page.lab,part:page.part,section:page.section,prev:prev,next:next}})
                      .options('debug', true)
                      labWindow.loadFile(path.join(__dirname, 'views/lab.ejs'));
                      callback(reqURL);
                    }
                  }
  if(!found){
    console.log("Lab doesn't exist?")
    errorCallback("Page not Found");
  }
  }

  var loading = function(){
      const ejse = require('ejs-electron')
      .options('debug', true)
      mainWindow.loadFile(path.join(__dirname, 'views/index.ejs'));
  }
  loading();

  var loadView = function(){
    fs.writeFileSync("src/labs/labs.json",JSON.stringify(Labs.Labs))
    const ejse = require('ejs-electron')
    .data({labs:Labs.Labs,actions:Actions.Actions})
    .options('debug', true)
    mainWindow.loadFile(path.join(__dirname, 'views/select.ejs'));
  }
  mainWindow.webContents.openDevTools();
  ipcMain.on('getCompletions', (event,page) => {
    getCompletions(page,function(response){ event.reply('completion-reply', response)},function(){event.reply('completion-reply', 'error')});
  })
  ipcMain.on('graph', (event,params) => {
    Graph("Function",params.signals,params.xlabel,params.ylabel,function(svg){event.reply('graph-reply', svg)},function(error){event.reply('graph-reply', error)});
  })
  ipcMain.on('simulate', (event,params) => {
    SPICE.ImageSimulate(params.circuit,function(svg){event.reply('simulate-reply',svg)},function(error){event.reply('simulate-reply',error)});
  })
  ipcMain.on('validate', (event,params) => {
    circuitValidate(params,
      function(token){ event.reply('validate-reply', token)},
      function(error){console.log(error); event.reply('validate-reply', error)}
    );
  })
  ipcMain.on('implement', (event,params) => {
    implementCircuit(params,function(response){ event.reply('implement-reply', response)},function(){event.reply('implement-reply', 'error')});
  })
  ipcMain.on('openLab', (event,page) => {
    openLab(page,function(response){ event.reply('openLab-reply', response)},function(){event.reply('openLab-reply', 'error')});
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
