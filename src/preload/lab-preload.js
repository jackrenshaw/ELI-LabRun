const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  SimulateCircuit: (netlist) => ipcRenderer.send('simulate', {circuit:netlist}),
  ValidateCircuit: (netlist,page) => ipcRenderer.send('validate', {circuit:netlist,lab:page.lab,part:page.part,section:page.section}),
  ImplementCircuit: (params) => ipcRenderer.send('implement',params),
  LoadCircuit: (lab,part,section,file) => ipcRenderer.send('load',{page:{lab:lab,part:part,section:section},file:file})
})

function compareIO(solution,submission){
  var inputs = [];
  var outputs = [];
  for(var s of solution)
    if(s.c == 'Input')
      inputs.push({x:s.x,y:s.y,c:"Solution Signal"})
    else if(s.c == 'Output')
      outputs.push({x:s.x,y:s.y,c:"Solution Signal"})
  for(var s of submission)
    if(s.c == 'Input')
      inputs.push({x:s.x,y:s.y,c:"Simulated Signal"})
    else if(s.c == 'Output')
      outputs.push({x:s.x,y:s.y,c:"Simulated Signal"})
  return {inputs:inputs,outputs:outputs}
}

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
    $("button[data-action='open-pane']").click(function(){
      console.log("Opening the Pane");
      ipcRenderer.send('openPane',{page:{lab:$("meta[name='circuit']").data("page").lab,part:$("meta[name='circuit']").data("page").part,section:$("meta[name='circuit']").data("page").section},preload:null,token:$(this).attr("data-token")})
    })
    ipcRenderer.on('graph-reply', (_event, arg) => {
      $("#Simulation .comparison-area").append(arg);
    });
    ipcRenderer.on('simulate-reply', (_event, arg) => {
      $("#Simulation p.sim-result").html(arg);
      $("#Simulation").addClass("is-active");
    })
    ipcRenderer.on('simulate-error', (_event, arg) => {
      $("body #Notifications").append(`<div class="notification is-warning  is-light">
      <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>Error</strong><br>
The simulation could not be performed<br>
<strong>Details:</strong><br>`+arg+`</div>`);
    })
    ipcRenderer.on('multimeter-reply', (_event, arg) => {
      const multimeter = $("meta[name='circuit']").data("multimeter");
      console.log(multimeter);
      var expectedNodeVoltages = {};
      var expectedAmmeterCurrents = {};
      for(var a of multimeter)
        if(/v\([0-9]+(,[0-9+])?\) = .+/.test(a)){
          var node = a.split(" = ")[0].replace(/[^0-9]/g,'')
          var voltage = parseFloat(a.split(" = ")[1]);
          expectedNodeVoltages[node] = voltage;
        }
        else if(/v\([0-9]+,[0-9+]?\)\/1m = .+/.test(a)){
          var nodes = a.split(" = ")[0].replace(/[^0-9,]/g,'').split(",");
          var current = parseFloat(a.split(" = ")[1])*1000;
        }
      console.log("Multimeter Response:");
      console.log(arg);
      var nodeVoltages = {};
      var ammeterCurrents = {};
      for(var a of arg)
        if(/v\([0-9]+(,[0-9+])?\) = .+/.test(a)){
          var node = a.split(" = ")[0].replace(/[^0-9]/g,'')
          var voltage = parseFloat(a.split(" = ")[1]);
          nodeVoltages[node] = voltage;
        }
        else if(/v\([0-9]+,[0-9+]?\)\/1m = .+/.test(a)){
          var nodes = a.split(" = ")[0].replace(/[^0-9,]/g,'').split(",");
          var current = parseFloat(a.split(" = ")[1])*1000;
        }
      console.log(nodeVoltages)
      console.log(ammeterCurrents);
      $("wire").each(function(){
        $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
        if(nodeVoltages.hasOwnProperty($(this).attr("data-spice-node")) && expectedNodeVoltages.hasOwnProperty($(this).attr("data-spice-node")))
          $(this).attr("data-tooltip",("Node:"+$(this).attr("data-spice-node")+"\nExpected:"+nodeVoltages[$(this).attr("data-spice-node")]+"V\nSimulated:"+nodeVoltages[$(this).attr("data-spice-node")]+"V\nMeasured:N/A"));
      });
      $("component[data-spice-type='Ammeter']").each(function(){
        $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
        $(this).attr("data-tooltip","Expected:0.1V\nSimulated:0.02V\nMeasured:0.01V");
      })
    })
    ipcRenderer.on('implement-error', (_event, arg) => {
      console.log("There was an error in implementation");
      console.log(arg);
      alert(arg)
    })
    ipcRenderer.on('save-reply', (_event, arg) => {
      if(arg == 'success')
        ipcRenderer.send('getload',{page:$("meta[name='circuit']").data("page")});
      else
        console.log("error!");
    })
    ipcRenderer.on('getload-reply', (_event, arg) => {
      $("#SaveLocal table tbody").html("")
      const page = $("meta[name='circuit']").data("page");
      for(var f of arg){
        var d = new Date(parseInt(f.replace('.json','')));
        $("#SaveLocal table tbody").append("<tr data-action='load' data-file='"+f+"' onclick=\"window.electronAPI.LoadCircuit('"+page.lab+"','"+page.part+"','"+page.section+"','"+f+"');\"><td>"+d.toLocaleString()+"</td></tr>");
      }
    })
    ipcRenderer.on('validate-reply', (_event, arg) => {
      console.log(arg)
      if(arg.hasOwnProperty('token')){
        $("#Simulation .modal-card p.validation-result").html("Validation Successful!:");
        $("button[data-action='implement']").data("token",arg.token);
        $("button[data-action='implement']").removeAttr("disabled");
      }else{
        $("#Simulation .modal-card p.validation-result").html("Validation Error!:");
        $("#Simulation .comparison-area").html("");
        const comparedResults = compareIO(arg.Signals[0],arg.Signals[1]);
        console.log(comparedResults);
        ipcRenderer.send('graph',{signals:comparedResults.inputs});
        ipcRenderer.send('graph',{signals:comparedResults.outputs});
      }
    })
    $("a[data-action='implement'],button[data-action='implement']").click(function(){
      console.log("implementing");
      var params = {
        page:$("meta[name='circuit']").data("page"),
        output:$("meta[name='circuit']").data("output").Post,
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
      if($("meta[name='circuit']").data("page")){
        ipcRenderer.send('load',{page:$("meta[name='circuit']").data("page"),file:$(this).data("file")});
      }
    })
  }
}