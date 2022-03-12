const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  SimulateCircuit: (netlist) => ipcRenderer.send('simulate', {circuit:netlist}),
  ValidateCircuit: (netlist,page) => ipcRenderer.send('validate', {circuit:netlist,lab:page.lab,part:page.part,section:page.section}),
  ImplementCircuit: (params) => ipcRenderer.send('implement',params),
  ChangeLab: (page) => ipcRenderer.send('')
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
      if(arg.hasOwnProperty('token'))
        $("#Simulation .modal-card p.validation-result").html("Simulation Successful!:"+arg.token);
      else
        $("#Simulation .modal-card p.validation-result").html("Simulation Error!:"+JSON.stringify(arg));
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
    $("a[data-action='changelab']").click(function(){
      console.log($(this).data("page"))
      ipcRenderer.send('openLab',$(this).data("page"));
      window.close();
    })
  }
}