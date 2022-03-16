const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  Graph: (params) => ipcRenderer.send('graph', params),
  Simulate: (netlist) => ipcRenderer.send('simulate', {circuit:netlist}),
})
document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
  ipcRenderer.on('graph-reply', (_event, arg) => {
    $(".graph-area div.image-area").html(arg);
  });
  ipcRenderer.on('simulate-reply', (_event, arg) => {
    $(".sim-area div.image-area").html(arg);
  });
  }
}