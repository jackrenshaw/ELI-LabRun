const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios')
const ejse = require('ejs-electron')
var fs = require("fs");
const { post } = require('jquery');

const SPICE = require("./modules/spice");
const Graph = require("./modules/graph");

SPICE.SpiceCommand = "ngspice";
SPICE.test(function(){
  console.log("SPICE Works Locally")
},function(){
  console.log("Spice doesn't work locally");
})

var auth_token = null;
var labs = null;
var completions = null;
const actions = require("./actions.js");
const { test } = require('./modules/spice');

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

function pullLabs(callback,error){
  axios
  .post(BASE+'l/',{token:auth_token})
  .then(res => {
    labs = res.data;
    console.log(labs)
    callback()
  })
  .catch(error => {
    console.error(error)
  })
}

function getCompletions(page,callback,errorCallback){
  axios
  .post(BASE+'e/',{token:auth_token})
  .then(res => {
    completions = res.data;
    console.log("Recieved Completions");
    console.log(labs)
    callback(labs)
  })
  .catch(error => {
    errorCallback(error)
  })
}

//This needs more validation (for params at a minimum)
//We also need to validate the actions object at some point
function enactCircuit(params,callback,errorCallback){
  var found = false;
  console.log(params);
  for(var l of actions)
    if(l.Name == params.lab){
      console.log("in lab")
      for(var p of l.Parts)
        if(p.Name == params.part){
          console.log("in part")
          for(var s of p.Sections)
            if(s.Name == params.section){
              console.log("in Section")
              found = true;
              s.Post[0].func(params.value,callback,errorCallback);
            }
        }
    }
  if(!found){
    console.log("No Action Available :(");
    errorCallback("No Action Available");
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
    var found = false;
    if(page.hasOwnProperty('lab') && page.hasOwnProperty('part'))
      for(var l of labs)
        if(l.Name == page.lab)
          for(var p of l.Parts)
            if(p.Name == page.part)
              if(p.hasOwnProperty('Sections'))
                if(p.Sections)
                  if(p.Sections.length)
                    if(p.Sections[0].Name){
                      const labWindow = new BrowserWindow({
                        width: 1200,
                        height: 800,
                        webPreferences: {
                          nodeIntegration: true,
                          preload: path.join(__dirname, 'preload/lab-preload.js')
                      }
                      });
                      labWindow.webContents.openDevTools();
                      found = true;
                      var reqURL = BASE+'l/'+page.lab+'/'+page.part+'/'+p.Sections[0].Name
                      labWindow.loadURL(reqURL);
                      callback(reqURL);
                    }
  if(!found)
    errorCallback("Page not Found");
  }

  var loadLogin = function(){
      const ejse = require('ejs-electron')
      .options('debug', true)
      mainWindow.loadFile(path.join(__dirname, 'views/index.ejs'));
  }
  loadLogin();

  var loadView = function(){
    const ejse = require('ejs-electron')
    .data({labs:labs,actions:actions})
    .options('debug', true)
    mainWindow.loadFile(path.join(__dirname, 'views/select.ejs'));
  }
  mainWindow.webContents.openDevTools();
  ipcMain.on('getCompletions', (event,page) => {
    getCompletions(page,function(response){ event.reply('completion-reply', response)},function(){event.reply('completion-reply', 'error')});
  })
  ipcMain.on('enactCircuit', (event,params) => {
    enactCircuit(params,function(response){ event.reply('enact-reply', response)},function(){event.reply('enact-reply', 'error')});
  })
  ipcMain.on('graph', (event,params) => {
    Graph("Function",params.signals,params.xlabel,params.ylabel,function(svg){event.reply('graph-reply', svg)},function(error){event.reply('graph-reply', error)});
  })
  ipcMain.on('simulate', (event,params) => {
    Spice.ImageSimulate(params.circuit,function(svg){event.reply('simulate-reply',svg)},function(error){event.reply('simulate-reply',error)});
  })
  ipcMain.on('openLab', (event,page) => {
    openLab(page,function(response){ event.reply('openLab-reply', response)},function(){event.reply('openLab-reply', 'error')});
  })
  ipcMain.on('login', (event,form) => {
    login(form,function(response){ 
        auth_token = response;
        pullLabs(loadView);
          event.reply('login-reply', 'success')
      },function(response){
          event.reply('login-reply', response)
      });
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
