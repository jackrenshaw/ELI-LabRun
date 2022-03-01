const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios')
const ejse = require('ejs-electron')
var fs = require("fs");
const actions = JSON.parse(fs.readFileSync(path.join(__dirname, 'actions.json')))

var auth_token = null;
var labs = null;

const BASE = 'http://localhost:3000/'

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

function getCompletions(page,callback,error){
  axios
  .post(BASE+'e/',{token:auth_token})
  .then(res => {
    labs = res.data;
    console.log("Recieved Completions");
    console.log(labs)
    callback(labs)
  })
  .catch(error => {
    console.error(error)
  })
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
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  var loadView = function(){
    const ejse = require('ejs-electron')
    .data({labs:labs,actions:actions})
    .options('debug', true)
    mainWindow.loadFile(path.join(__dirname, 'view.ejs'));
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
