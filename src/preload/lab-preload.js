const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  SimulateCircuit: (netlist) => ipcRenderer.send('simulate', {circuit:netlist}),
  ValidateCircuit: (netlist,lab,part,section) => ipcRenderer.send('validate', {circuit:netlist,lab:lab,part:part,section:section}),
  ImplementCircuit: (params) => ipcRenderer.send('implement',params)
})



document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    ipcRenderer.on('simulate-reply', (_event, arg) => {
      $("#Simulation p.sim-result").html(arg);
      $("#Simulation").addClass("is-active");
    })
    ipcRenderer.on('implement-reply', (_event, arg) => {
      console.log(arg)
    })
    ipcRenderer.on('validate-reply', (_event, arg) => {
      console.log(arg)
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