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
        board:$("#main").html()
      }
      return preload;
    }
    $("button[data-action='open-pane']").click(function(){
      console.log("Opening the Pane");
      ipcRenderer.send('openPane',{page:{lab:$("meta[name='circuit']").data("page").lab,part:$("meta[name='circuit']").data("page").part,section:$("meta[name='circuit']").data("page").section},preload:null,token:$(this).attr("data-token")})
    })
    $("a[data-action='simulate']").dblclick(function(){
      console.log("Opening the Graph Window");
      ipcRenderer.send('openGraphWindow',null)
    })
    ipcRenderer.on('graph-reply', (_event, arg) => {
      $("#Simulation .comparison-area").append(arg);
    });
    ipcRenderer.on('simulate-reply', (_event, arg) => {
      $("#Simulation p.sim-result").html(arg);
      $("#Simulation").addClass("is-active");
    })
    ipcRenderer.on('simulatedata-reply', (_event, arg) => {
      console.log("Simulation Response:");
      console.log(arg)
    })
    ipcRenderer.on('rawdata-reply', (_event, arg) => {
      console.log("Raw Data:");
      console.log(arg)
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
      var expectedAmmeterCurrents = {};
      for(var a of multimeter)
        if(/v\([0-9]+(,[0-9+])?\) = .+/.test(a)){
          var node = a.split(" = ")[0].replace(/[^0-9]/g,'')
          var voltage = parseFloat(a.split(" = ")[1]);
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
          var node = parseInt(a.split(" = ")[0].replace(/[^0-9]/g,''))
          var voltage = parseFloat(a.split(" = ")[1]);
          nodeVoltages[node] = voltage;
        }
        else if(/v\([0-9]+,[0-9+]?\)\/1m = .+/.test(a)){
          const nodes = a.split(" = ")[0].replace('/1m','').replace(/[^0-9,]/g,'').split(",");
          const current = Math.round(parseFloat(a.split(" = ")[1])*100000)/100;
          $("component[data-spice-type='Ammeter']").each(function(){
            console.log(nodes);
            console.log(parseInt($(this).find("port[name='+']").attr("data-spice-node")));
            console.log(parseInt($(this).find("port[name='-']").attr("data-spice-node")));
            if(parseInt($(this).find("port[name='+']").attr("data-spice-node")) == parseInt(nodes[0]))
              if(parseInt($(this).find("port[name='-']").attr("data-spice-node")) == parseInt(nodes[1])){
                console.log("Found the Ammeter we're interested in")
                $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
                $(this).attr("data-tooltip",("Ammeter:"+$(this).attr("data-spice-name")+"\nSimulated:"+current+"mA\nMeasured:N/A"));
              }
          })
        }
      console.log(nodeVoltages)
      console.log(ammeterCurrents);
      $("wire").each(function(){
        $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
        if(nodeVoltages.hasOwnProperty(parseInt($(this).attr("data-spice-node"))))
          $(this).attr("data-tooltip",("Node:"+$(this).attr("data-spice-node")+"\nSimulated:"+nodeVoltages[$(this).attr("data-spice-node")]+"V\nMeasured:N/A"));
      });
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
      const Mapping = $("meta[name='circuit']").data("mapping");
      $("#confirm-modal").addClass("is-active");
      console.log("implementing");
      var params = {
        page:$("meta[name='circuit']").data("page"),
        output:$("meta[name='circuit']").data("output").Post,
        token:$(this).data("token")
      }
      console.log($(this).attr("data-alt"))
      if($(this).attr("data-alt"))
        params.output = $("meta[name='circuit']").data("alt")[parseInt($(this).attr("data-alt"))].Output.Post
      if($(this).attr("data-overwrite")){
        var overwriteData = JSON.parse($(this).attr("data-overwrite"));
        if(overwriteData.length == 2 && overwriteData[0].length == 8 && overwriteData[1].length == 8)
          for(var i=0;i<2;i++)
            for(var p=0;p<8;p++)
              if(overwriteData[i][p] == 0 || overwriteData[i][p] == 1)
                params.output.Digital[i][p] = overwriteData[i][p]
      }
      params.output.Analog = JSON.parse($(this).attr("data-analog"));
      console.log(params);
      $("#confirm-modal tbody").html("");
      for(var a=0;a<8;a++){
        var tableline = "<tr><td>"+a+"</td><td>"+params.output.Digital[0][a];
        if(Mapping[0][a])
          tableline += " <b>("+Mapping[0][a]+")</b>";
        tableline += "</td><td>"+params.output.Digital[1][a]
        if(Mapping[1][a])
          tableline += " <b>("+Mapping[1][a]+")</b>";
        tableline += "</td></tr>"
        $("#confirm-modal tbody").append(tableline);
      }
      var analog1 = "<tr><td>Analog Output 1</td><td>"+params.output.Analog[0];
      var analog2 = "<tr><td>Analog Output 2</td><td>"+params.output.Analog[1];
      $("#confirm-modal tbody").append(analog1).append(analog2);
      ipcRenderer.send('implement',params)
    })
    $("a[data-action='clear'],button[data-action='clear']").click(function(){
      console.log("Resetting all switches to pre configuration");
      var params = {
        page:$("meta[name='circuit']").data("page"),
        output:$("meta[name='circuit']").data("output").Pre,
        token:$(this).data("token")
      }
      console.log(params);
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
        ipcRenderer.send('load',{page:$("meta[name='circuit']").data("page"),file:$(this).data("file"),data:null});
      }
    })
    $("html").on("dragover", function(event) {
      event.preventDefault();  
      event.stopPropagation();
      $(this).addClass('dragging');
  });
  
  $("html").on("dragleave", function(event) {
      event.preventDefault();  
      event.stopPropagation();
      $(this).removeClass('dragging');
  });
  
  $("html").on("drop", function(ev) {
      ev.preventDefault();  
      ev.stopPropagation();
      console.log("Dropped!");
      var file = ev.originalEvent.dataTransfer.files[0];
      reader = new FileReader();
      reader.onload = function(event) {
          console.log(event.target);
          ipcRenderer.send('load',{page:$("meta[name='circuit']").data("page"),file:null,data:JSON.parse(event.target.result)});
          //$("main").html(event.target.result);
      };
      var txt = reader.readAsText(file);
      //if($("#SaveLocal").hasClass("is-active"))
  });
  }
}