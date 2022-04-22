var Check = {
  Validate:function(){
  console.log("Validating Circuit");
  $("wire").each(function(){
    $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
    $(this).attr("data-tooltip","Node:"+$(this).attr("data-spice-node"));
  });
  $("port").each(function(){
    $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
    $(this).attr("data-tooltip","Name:"+$(this).attr("name")+"\nNode:"+$(this).attr("data-spice-node"));
  });
  var continuityErrors = [];//checkCircuitContinuity();
  if(!continuityErrors.length){
    console.log("Continuity Check passed!");
    Check.SetComponents();
    var checkResult = Check.CheckComponents();
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
},
checkCircuitContinuity:function(){
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
},
checkConnected:function(_wire,_port){
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
},
SetComponents:function(){
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
      if(inSpan(WireSpan,PortSpan))
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
},
CheckComponents:function(){
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
          var reqPorts = [];
          var conPorts = [];
          $(this).parent("component").find("port").each(function(){
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
}