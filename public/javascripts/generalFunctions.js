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

setMultimeter = function(arg){
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
}

Simulate = function(){
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
      $.post("http://127.0.0.1:3001/simulate",{
        circuit:netlist
      }).done(function(data){
        console.log(data);
        setMultimeter(data.multimeter);
        $("#Simulation p.sim-result").html(data.simulate);
        $("#Simulation").addClass("is-active");
      }).fail(function(error){
        console.log(error)
      })
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
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}