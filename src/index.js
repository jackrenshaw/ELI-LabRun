const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios')
const ejse = require('ejs-electron')
var fs = require("fs");
const { post } = require('jquery');

const SPICE = require("./modules/spice");
const Graph = require("./modules/graph");
const Labs = require("./modules/labs")

var labRead = null;
const isMac = process.platform === 'darwin'

const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      {label: 'New',
      submenu: [
        {
          label: 'New Simulation',
          click: async () => {
            openSimulation();
          }
        },
        {
          label: 'New Graphing Window',
          click: async () => {
            openGraph();
          }
        },
      ]},
      isMac ? { role: 'close' } : { role: 'quit' },
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://electronjs.org')
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

var auth_token = null;
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
      for(var l of Labs.Labs)
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
                      const ejse = require('ejs-electron')
                      .data({section:p.Sections[0],part:p,page:{prev:null,next:null}})
                      .options('debug', true)
                      labWindow.loadFile(path.join(__dirname, 'views/lab.ejs'));
                      callback(reqURL);
                    }
  if(!found)
    errorCallback("Page not Found");
  }

  var loading = function(){
      const ejse = require('ejs-electron')
      .options('debug', true)
      mainWindow.loadFile(path.join(__dirname, 'views/index.ejs'));
  }
  loading();

  var loadView = function(){
    const ejse = require('ejs-electron')
    .data({labs:Labs.Labs,actions:actions})
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
    SPICE.ImageSimulate(params.circuit,function(svg){event.reply('simulate-reply',svg)},function(error){event.reply('simulate-reply',error)});
  })
  ipcMain.on('openLab', (event,page) => {
    openLab(page,function(response){ event.reply('openLab-reply', response)},function(){event.reply('openLab-reply', 'error')});
  })

  SPICE.SpiceCommand = "ngspice";
  SPICE.test(async function(){
    console.log("SPICE Works Locally");
    await Labs.setLabs("src/labs")
    setTimeout(loadView, 5000);
  },function(){
    console.log("Spice doesn't work locally");
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
