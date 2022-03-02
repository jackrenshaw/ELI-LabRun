const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('set-title', title),
  login: (form) => ipcRenderer.send('login',form),
  getCompletions: (page) => ipcRenderer.send('getCompletions',page)
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    $("button[data-action='implement']").click(function(){
      var params = {
        lab:$(this).data("lab"),
        part:$(this).data("part"),
        section:$(this).data("section"),
        value:$(this).data("value")
      }
      ipcRenderer.send('enactCircuit',params)
    })
  }
}