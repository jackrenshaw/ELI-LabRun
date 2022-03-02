const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  SimulateCircuit: (netlist) => ipcRenderer.send('simulate', {circuit:netlist}),
  login: (form) => ipcRenderer.send('login',form),
  getCompletions: (page) => ipcRenderer.send('getCompletions',page)
})



document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    ipcRenderer.on('simulate-reply', (_event, arg) => {
      $("#Simulation p.sim-result").html(arg);
      $("#Simulation").addClass("is-active");
    })
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