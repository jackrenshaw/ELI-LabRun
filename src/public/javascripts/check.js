validate = function(){
  console.log("Validating Circuit");
  var continuityErrors = [];//checkCircuitContinuity();
  if(!continuityErrors.length){
    console.log("Continuity Check passed!");
    SetComponents();
    var checkResult = CheckComponents();
    console.log(checkResult);
    if(checkResult.matchedALT)
      console.log(checkResult.matchedALT);
  }else{
    console.log("There are continuity errors in this circuit");
    for(var e of continuityErrors)
      UI.Notification("Error","You have a discontinuity in one of your nodes! You must correct this prior to enacting the circuit",("Node:"+e))
  }
}

checkCircuitContinuity = function(){
  var nodeSpans = {};
  var continuityErrors = [];
  $("wire").each(function(){
    if(!nodeSpans.hasOwnProperty($(this).attr("data-spice-node")))
      nodeSpans[$(this).attr("data-spice-node")] = [];
      nodeSpans[$(this).attr("data-spice-node")].push({
        horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
        vertical:[$(this).offset().top,($(this).offset().top+$(this).height())]
      });
  });
  for(var s in nodeSpans)
    if(CheckContinuity(nodeSpans[s]))
      console.log("this node is continuous");
    else
      continuityErrors.push(s)
  return continuityErrors;
}

SetComponents = function(){
  $("port").each(function(){
    var _port = this;
    var portWidth = $(_port).width();
    var portHeight = $(_port).height();
    if($(this).parent("component,ground").hasClass("rotated-90") || $(this).parent("component").hasClass("rotated-90")){
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
      if(UI.inSpan(PortSpan,WireSpan)){
        console.log("found a match");
        match = true;
        console.log($(_wire).attr("data-spice-node"));
        $(_port).attr("data-spice-node",$(_wire).attr("data-spice-node"));
      }
    });
    if(!match)
      $(_port).attr("data-spice-node",'0');
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
    altresults:new Array($("meta[name='circuit']").data("alt").length).fill(0),
    altverbose:new Array($("meta[name='circuit']").data("alt").length).fill([]),
    matchedALT:null
  }
  //Iterate through each port
  $("component port").each(function(){
    //Ignore ports which don't have a target node
    if($(this).attr("data-spice-target-node") || $(this).attr("data-spice-target-node") == '0'){
      //Consider component directionality
      if($(this).parent("component").data("spice-directional") == false){
        var reqPorts = [];
        var conPorts = [];
        $(this).parent("component").find("port").each(function(){
          reqPorts.push($(this).attr("data-spice-node"))
          conPorts.push($(this).attr("data-spice-target-node"))
        })
        if(reqPorts.sort().join(" ") == conPorts.sort().join(" "))
          results.matching.push($(this).parent("component").attr("data-spice-name")+" Port: "+$(this).attr("name"))
        else
          results.notmatching.push($(this).parent("component").attr("data-spice-name")+" Port: "+$(this).attr("name"))
      }else{
        if($(this).attr("data-spice-node") == $(this).attr("data-spice-target-node"))
          results.matching.push($(this).parent("component").attr("data-spice-name")+" Port: "+$(this).attr("name"))
        else
          results.notmatching.push($(this).parent("component").attr("data-spice-name")+" Port: "+$(this).attr("name"))    
      }
    if($(this).data("spice-target-alt-node"))
      if($(this).data("spice-target-alt-node").length == results.altresults.length)
        for(var a in $(this).data("spice-target-alt-node"))
          if($(this).parent("component").data("spice-directional") == false){
            var reqPorts = [];
            var conPorts = [];
            $(this).parent("component").find("port").each(function(){
              conPorts.push($(this).attr("data-spice-node"))
              reqPorts.push($(this).data("spice-target-alt-node")[a])
            })
            if(reqPorts.sort().join(" ") == conPorts.sort().join(" "))
              void(0);
            else{
              results.altresults[a] += 1;
            }
          }else{
            if($(this).attr("data-spice-node") == $(this).data("spice-target-alt-node")[a])
              void(0);
            else{
              results.altresults[a] += 1;
            }
          }
      else
        results.altresults.fill(-1);
    else
      results.altresults.fill(-1);
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
    var min = {index:0,value:results.altresults[0]};
    var pcount = 0;
    for(var a in results.altresults){
      if(results.altresults[a] == 0)
        pcount++;
      if(results.altresults[a] < min.value){
        min.index = a;
        min.value = results.altresults[a];
      }
    }
    if(pcount == 1){
      UI.Notification("Success",("Your circuit matched a valid hardware implementation:"),$("meta[name='circuit']").data("alt")[min.index].Name)
      results.matchedALT = min.index;
    }else if(pcount == 0){
      console.log("no matches")
      UI.Notification("Warning","Your circuit failed to match a hardware implementation.","There are at least "+min.value+" ports misconfigured. Inspect your connections, node voltages and simulation output.")
    }else{
      UI.Notification("Error","Your circuit matches multiple possible implementations. Please report this to your lab demonstrator","")
    }
  }
  return results;
}