const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios')
const ejse = require('ejs-electron')
var fs = require("fs");
const { post } = require('jquery');

var auth_token = null;
var labs = null;
var completions = null;
const actions = require("./actions.js");

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

function enactCircuit(token,callback,errorCallback){
  console.log(token);
  var found = false;
  if(completions)
    if(completions.hasOwnProperty('token'))
      if(completions.token == token)
        for(var al of actions)
          if(al.Name == completions.page.lab)
            for(var ap of al.Parts)
              if(ap.Name == completions.page.part)
                for(var as of ap.Sections)
                  if(as.Name == completions.page.section)
                    if(as.hasOwnProperty('Post'))
                      if(as.Post.length)
                        if(as.Post[0].hasOwnProperty('func')){
                          found = true;
                          as.Post[0].func(callback,errorCallback);
                        }
  if(!found)
    errorCallback('Invalid Token/Action');
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
      preload: path.join(__dirname, 'preload.js')
  }
  });
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

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  ipcMain.on('set-title', (event, title) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
  })
  ipcMain.on('getCompletions', (event,page) => {
    getCompletions(page,function(response){ event.reply('completion-reply', response)},function(){event.reply('completion-reply', 'error')});
  })
  ipcMain.on('enactCircuit', (event,token) => {
    enactCircuit(token,function(response){ event.reply('enact-reply', response)},function(){event.reply('enact-reply', 'error')});
  })
  ipcMain.on('login', (event,form) => {
    login(form,function(response){ 
        auth_token = response;
        pullLabs(loadView);
          event.reply('login-reply', 'success')
      },function(){
          event.reply('login-reply', 'error')
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
