const rectanglesIntersect = function(minAx,minAy,maxAx,maxAy,minBx,minBy,maxBx,maxBy ) {
  var aLeftOfB = maxAx < minBx;
  var aRightOfB = minAx > maxBx;
  var aAboveB = minAy > maxBy;
  var aBelowB = maxAy < minBy;
  return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );
}

const inSpan = function(spans1,spans2){
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
}

const CheckContinuity = function(wirespans){
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

Simulate = function(){
  Check.SetComponents();
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