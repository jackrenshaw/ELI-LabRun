Simulate = function(){
    SetComponents();
    $("wire").each(function(){
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      $(this).attr("data-tooltip","Node:"+$(this).attr("data-spice-node"));
    });
    $("port").each(function(){
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      $(this).attr("data-tooltip","Node:"+$(this).attr("data-spice-node"));
    });
    $("#sidebar .container div[name='SPICE']").html("");
    //$("#sidebar").show();
    html2canvas(document.querySelector("body")).then(canvas1 => {
      //$("#sidebar .container div[name='SPICE']").append("<br><h2>Circuit Image</h2><p>You can right click on this image to save it</p>");
      //$("#sidebar .container div[name='SPICE']").append(canvas1);
      //$("#sidebar .container div[name='SPICE']").append("<hr>");
  
      $("#sidebar .container div[name='SPICE'] canvas").css("width","25%").css("height","25%").css("margin-bottom","-100px");
    $("#sidebar .container div[name='SPICE']").append("<br><h2 class='subtitle'>Conversion Output</h2>");
    UI.makeSPICE("simulation",function(error){
      $("#sidebar .container div[name='SPICE']").append(error+"<br>");
      $("body #Notifications").append(`<div class="notification is-danger  is-light">
        <button class="delete" onclick='$(this).parent().remove()'></button>
  <strong>Error</strong><br>
  There was an error simulating the circuit. Please check your circuit<br>
  <strong>Details:</strong><br>`+error+`</div>`);
    },function(input){
      $("#sidebar .container div[name='SPICE']").append(input+"<br>");
    },function(netlist,normalised){
      console.log("Simualting and Validating Circuit");
      window.electronAPI.SimulateCircuit(netlist);
      console.log(netlist)
      $("body #Notifications").append(`<div class="notification is-info  is-light">
      <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>SPICE Circuit</strong><br>
The circuit is below
<strong>Details:</strong><br>`+netlist.replace(/\n/g,'<br>')+`</div>`);
    });
    $("a[href='#output-netlist'],a[href='#output-nodal']").removeClass("disabled");
    $("#sidebar .container div[name='SPICE']").append("<hr><h2 id='output-netlist' class='subtitle'>SPICE Output</h2><i>You can run this in a command line simulator like ngSPICE</i><br>"+UI.SPICE.SPICE.replace(/\n/g,'<br>')+"<hr>");
    $("#sidebar .container div[name='SPICE']").append("<h2 id='output-nodal' class='subtitle'>Nodes</h4>")
      UI.showNodes();
      html2canvas(document.querySelector("body")).then(canvas2 => {
        //$("#sidebar .container div[name='SPICE']").append(canvas2);
        //$("#sidebar .container div[name='SPICE'] canvas").css("width","25%").css("height","25%").css("margin-bottom","-100px");;
        UI.hideNodes()
      });
    });
  
}

validate = function(){
  console.log("Validating Circuit");
  $("wire").each(function(){
    $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
    $(this).attr("data-tooltip","Node:"+$(this).attr("data-spice-node"));
  });
  $("port").each(function(){
    $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
    $(this).attr("data-tooltip","Node:"+$(this).attr("data-spice-node"));
  });
  var continuityErrors = checkCircuitContinuity();
  if(!continuityErrors.length){
    console.log("Continuity Check passed!");
    SetComponents();
    var checkResult = CheckComponents();
    console.log(checkResult);
    if(checkResult.matchedALT)
      console.log(checkResult.matchedALT);
  }else{
    console.log("There are continuity errors in this circuit");
    for(var e of continuityErrors){
      UI.Notification("Error","You have a discontinuity in one of your nodes! You must correct this prior to enacting the circuit",("Node:"+e))
      $("wire[data-spice-node='"+e+"']").each(function(){
        if($(this).attr("data-spice-revert-node"))
          $(this).attr("data-spice-node",$(this).attr("data-spice-revert-node"));
      })
    }
  }
}

checkCircuitContinuity = function(){
  var nodeSpans = {};
  var continuityErrors = [];
  $("wire").each(function(){ if($(this).width() > 5 && $(this).height() > 5){
    if(!nodeSpans.hasOwnProperty($(this).attr("data-spice-node")))
      nodeSpans[$(this).attr("data-spice-node")] = [];
    nodeSpans[$(this).attr("data-spice-node")].push({
      horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
      vertical:[$(this).offset().top,($(this).offset().top+$(this).height())]
    });
  }});
  for(var s in nodeSpans)
    if(CheckContinuity(nodeSpans[s]))
      console.log("this node is continuous");
    else
      continuityErrors.push(s)
  return continuityErrors;
}

checkConnected = function(_wire,_port){
  console
  const WireSpan = [{
    horizontal:[$(_wire).offset().left,($(_wire).offset().left+$(_wire).width())],
    vertical:[$(_wire).offset().top,($(_wire).offset().top+$(_wire).height())]
  }];
  var portWidth = $(_port).width();
  var portHeight = $(_port).height();
  if($(this).parent("component").hasClass("rotated-270") || $(this).parent("component").hasClass("rotated-90")){
    portWidth = $(_port).height();
    portHeight = $(_port).width();
  }
  const PortSpan = [{
    horizontal:[$(_port).offset().left,($(_port).offset().left+portWidth)],
    vertical:[$(_port).offset().top,($(_port).offset().top+portHeight)]
  }];
  console.log(inSpan(WireSpan,PortSpan));
}

SetComponents = function(){
  $("connectors port").each(function(){
    const _port = this;
    const PortSpan = [{
      horizontal:[$(_port).offset().left,($(_port).offset().left+$(_port).width())],
      vertical:[$(_port).offset().top,($(_port).offset().top+$(_port).height())]
    }];
    $(_port).attr("data-spice-node","999")
    $("wire").each(function(){
      const _wire = this;
      const WireSpan = [{
        horizontal:[$(_wire).offset().left,($(_wire).offset().left+$(_wire).width())],
        vertical:[$(_wire).offset().top,($(_wire).offset().top+$(_wire).height())]
      }];
      if(UI.inSpan(WireSpan,PortSpan))
        $(_port).attr("data-spice-node","999")
    })
  })
  $("port").each(function(){
    var _port = this;
    var portWidth = $(_port).width();
    var portHeight = $(_port).height();
    if($(this).parent("component").hasClass("rotated-270") || $(this).parent("component").hasClass("rotated-90")){
      portWidth = $(_port).height();
      portHeight = $(_port).width();
    }
    const PortSpan = [{
      horizontal:[$(_port).offset().left,($(_port).offset().left+portWidth)],
      vertical:[$(_port).offset().top,($(_port).offset().top+portHeight)]
    }];
    match = false;
    $("wire").each(function(){
      var _wire = this;
      if($(_wire).width() == 0 || $(_wire).height() == 0) $(_wire).hide();
      const WireSpan = [{
        horizontal:[$(_wire).offset().left,($(_wire).offset().left+$(_wire).width())],
        vertical:[$(_wire).offset().top,($(_wire).offset().top+$(_wire).height())]
      }];
      if(inSpan(PortSpan,WireSpan) && $(_port).width() > 0 && $(_port).height() > 0){
        console.log("found a match for"+$(_port).parent("component").attr("data-spice-name")+" port:"+$(_port).attr("id"));
        match = true;
        console.log($(_wire).attr("data-spice-node"));
        $(_port).attr("data-spice-node",$(_wire).attr("data-spice-node"));
      }
    });
    if(!match){
      console.log($(_port).parent("component").attr("data-spice-name")+" isn't on a node");
      console
      //$(_port).attr("data-spice-node",'-1');
    }
  })
  return true;
}

rectanglesIntersect = function(minAx,minAy,maxAx,maxAy,minBx,minBy,maxBx,maxBy ) {
  var aLeftOfB = maxAx < minBx;
  var aRightOfB = minAx > maxBx;
  var aAboveB = minAy > maxBy;
  var aBelowB = maxAy < minBy;
  return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );
},

inSpan = function(spans1,spans2){
  console.log(spans1)
  console.log(spans2)
  if(spans1) for(var s1 of spans1)
    if(spans2) for(var s2 of spans2)
      //Horizontally aligned
      if(rectanglesIntersect(
        s1.horizontal[0],
        s1.vertical[0],
        s1.horizontal[1],
        s1.vertical[1],
        s2.horizontal[0],
        s2.vertical[0],
        s2.horizontal[1],
        s2.vertical[1])
        ) return true;
      return false;
  },

CheckContinuity = function(wirespans){
  var exclusions = [0];
  var w = [wirespans[0]];
  for(var i=0;i<wirespans.length;i++)
  for(var s in wirespans){
    if(inSpan(w,[wirespans[s]]) && s != 0 && !exclusions.includes(s)){
      w.push(wirespans[s]);
      exclusions.push(s)
    }
  }
  if(w.length < wirespans.length)
    return false;
  else
    return true;
}

console.log(CheckContinuity([{
  vertical:[0,100],
  horizontal:[0,6]
},{
  vertical:[101,200],
  horizontal:[0,6]
},{
  vertical:[98,101],
  horizontal:[0,6]
},{
  vertical:[98,101],
  horizontal:[5,10]
}]));

CheckComponents = function(){
  //Setup results object;
  var results = {
    matching:[],
    notmatching:[],
    altresults:new Array($("meta[name='circuit']").data("alt").length),
    matchedALT:null
  }
  for(var a=0;a<results.altresults.length;a++)
    results.altresults[a] = [];
  console.log(results);
  //Iterate through each port
  $("component port").each(function(){
    //Ignore ports which don't have a target node array
    if($(this).attr("data-spice-target-nodes")){
    if($(this).data("spice-target-nodes"))
      if($(this).data("spice-target-nodes").length == results.altresults.length)
        for(var a in $(this).data("spice-target-nodes"))
        if($(this).parent("component").data("spice-directional") == false){
          console.log("We are dealing with a directional component")
          var reqPorts = [];
          var conPorts = [];
          $(this).parent("component").find("port").each(function(){
            console.log($(this).attr("data-spice-node"));
            reqPorts.push(parseInt($(this).attr("data-spice-node")))
            conPorts.push(parseInt($(this).data("spice-target-nodes")[a]))
          })
          if(reqPorts.sort().join(" ") != conPorts.sort().join(" ")){
            if(!results.altresults[a])
              results.altresults[a] = [];
            results.altresults[a].push($(this).parent("component").attr("data-spice-name")+" Port: "+$(this).attr("name")+" should be on node: "+$(this).data("spice-target-nodes")[a]+" but it is actually on node: "+$(this).attr("data-spice-node"))
          }
        }else{
          if(parseInt($(this).attr("data-spice-node")) != parseInt($(this).data("spice-target-nodes")[a])){
            if(!results.altresults[a])
              results.altresults[a] = [];
            results.altresults[a].push($(this).parent("component").attr("data-spice-name")+" Port: "+$(this).attr("name")+" should be on node: "+$(this).data("spice-target-nodes")[a]+" but it is actually on node: "+$(this).attr("data-spice-node"))
          }
        }
      else
        results.altresults[a].push("Alt Length Error");
    else
      results.altresults[a].push("No Alt Length Provided");
  }
  })
  $("connectors port").each(function(){
    for(var a in $(this).data("spice-target-nodes"))
      if(parseInt($(this).attr("data-spice-node")) != parseInt($(this).data("spice-target-nodes")[a])){
        results.altresults[a].push($(this).data("spice-bench")+" should be connected to node:"+parseInt($(this).data("spice-target-nodes")[a])+" but it is actually on node:"+parseInt($(this).attr("data-spice-node")))
      }
  })
  if($("meta[name='circuit']").data("page").prev || $("meta[name='circuit']").data("page").next){
    if(results.notmatching.length){
      $("body #Notifications").append(`<div class="notification is-warning  is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Error</strong><br>Some of your connections are incorrect<br><strong>Details:</strong><br>`+results.notmatching.join('<br>')+`</div>`);
      $("nav button[data-action='implement']").prop("disabled", true).css("background-color","#363636").css("color","#aaa").css("cursor","disabled");;
    }else
      $("nav button[data-action='implement']").prop("disabled", false).css("color","#fff").css("cursor","pointer");
    if(results.matching.length)
      $("body #Notifications").append(`<div class="notification is-success  is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Success</strong><br>Some of your connections are correct<br><strong>Details:</strong><br>`+results.matching.join('<br>')+`</div>`);
  }else{ //creative mode
    var min = {index:0,value:0};
    if(results.altresults[0])
      min.value = results.altresults[0].length;
    var pcount = 0;
    console.log(results);
    for(var a in results.altresults){
      if(results.altresults[a].length == 0)
        pcount++;
      if(results.altresults[a].length < min.value){
        min.index = a;
        min.value = results.altresults[a].length;
      }
    }
    if(pcount == 1){
      UI.Notification("Success",("Your circuit matched a valid hardware implementation:"),$("meta[name='circuit']").data("alt")[min.index].Name)
      results.matchedALT = min.index;
      $("nav button[data-action='implement']").attr("data-alt",min.index).data("analog",UI.Analog).prop("disabled", false).css("color","#fff").css("cursor","pointer");
    }else if(pcount == 0){
      $("nav button[data-action='implement']").attr("data-alt",min.index).prop("disabled", true).css("color","#aaa").css("cursor","disabled");
      console.log("no matches")
      UI.Notification("Warning","Your circuit failed to match a hardware implementation.","There are at least "+min.value+" ports misconfigured. The closest configuration is: <br><b>"+$("meta[name='circuit']").data("alt")[min.index].Name+"</b><br> Inspect your connections, node voltages and simulation output. The closest configuration is mismatched in the following way:<br>"+results.altresults[min.index].join("<br>"))
    }else{
      UI.Notification("Error","Your circuit matches multiple possible implementations. Please report this to your lab demonstrator","")
    }
  }
  return results;
}