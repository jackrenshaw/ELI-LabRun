const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  SimulateCircuit: (netlist) => ipcRenderer.send('simulate', {circuit:netlist}),
  ValidateCircuit: (netlist,page) => ipcRenderer.send('validate', {circuit:netlist,lab:page.lab,part:page.part,section:page.section}),
  ImplementCircuit: (params) => ipcRenderer.send('implement',params),
  LoadCircuit: (lab,part,section,file) => ipcRenderer.send('load',{page:{lab:lab,part:part,section:section},file:file})
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    function generatePreload(){
      var preload = {
        voltage1:$("#Source input[name='voltage1']").val(),
        voltage2:$("#Source input[name='voltage2']").val(),
        siggen_frequency:$("#SignalGenerator td[name='frequency']").html(),
        siggen_voltage:$("#SignalGenerator td[name='voltage']").html(),
        board:$("main").html()
      }
      return preload;
    }    
    ipcRenderer.on('simulate-reply', (_event, arg) => {
      $("#Simulation p.sim-result").html(arg);
      $("#Simulation").addClass("is-active");
    })
    ipcRenderer.on('implement-reply', (_event, arg) => {
      console.log(arg)
    })
    ipcRenderer.on('save-reply', (_event, arg) => {
      if(arg == 'success')
        ipcRenderer.send('getload',{page:$("meta[name='page']").data("page")});
      else
        console.log("error!");
    })
    ipcRenderer.on('getload-reply', (_event, arg) => {
      $("#SaveLocal table tbody").html("")
      const page = $("meta[name='page']").data("page");
      for(var f of arg){
        var d = new Date(parseInt(f.replace('.json','')));
        $("#SaveLocal table tbody").append("<tr data-action='load' data-file='"+f+"' onclick=\"window.electronAPI.LoadCircuit('"+page.lab+"','"+page.part+"','"+page.section+"','"+f+"');window.close();\"><td>"+d.toLocaleString()+"</td></tr>");
      }
    })
    ipcRenderer.on('validate-reply', (_event, arg) => {
      console.log(arg)
      if(arg.hasOwnProperty('token')){
        $("#Simulation .modal-card p.validation-result").html("Simulation Successful!:");
        $("button[data-action='implement']").data("token",arg.token);
      }else
        $("#Simulation .modal-card p.validation-result").html("Simulation Error!:"+JSON.stringify(arg));
    })
    $("button[data-action='implement']").click(function(){
      var params = {
        page:$("meta[name='page']").data("page"),
        value:null,
        token:$(this).data("token")
      }
      ipcRenderer.send('implement',params)
    })
    $("a[data-action='changelab']").click(function(){
      console.log($(this).data("page"))
      const preload = generatePreload();
      console.log(preload);
      if($(this).data("page")){
        ipcRenderer.send('openLab',{page:$(this).data("page"),preload:preload});
        window.close();
      }
    })
    $("a[data-action='getload']").click(function(){
      if($(this).data("page")){
        ipcRenderer.send('getload',{page:$(this).data("page")});
      }
    })
    $("a[data-action='save']").click(function(){
      const preload = generatePreload();
      if($(this).data("page")){
        ipcRenderer.send('save',{page:$(this).data("page"),preload:preload});
      }
    })
    $("tr[data-action='load']").click(function(){
      if($("meta[name='page']").data("page")){
        ipcRenderer.send('load',{page:$("meta[name='page']").data("page"),file:$(this).data("file")});
        window.close();
      }
    })
  }
}