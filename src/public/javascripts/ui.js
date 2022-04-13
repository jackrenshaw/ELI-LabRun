/*

*/
var UI = {
  Page:null,
  FrameWork: $("meta[name='wireframe']").attr("content"),
  selectedComponent:null,
  selectedWire:null,
  SPICE:null,
  nodes:[],
  Analog:[0.0,0.0],
  clear: function(){
    //clear all bindings, start from a blank slate
    $("component,wire,ground").off("dblclick");
    $("wire").off("click");
    $("component,ground").css("cursor","default");
  },
  select: function(){
    console.log("selecting/moving components")
    $("component,ground").css("cursor","pointer");
    //UI.SelectListen();
    UI.RotateListen();
    UI.ComponentDrop();
    UI.DeleteListen();
  },
  SelectListen: function(){
    $("component").click(function(){
      $("component").each(function(){ 
        $(this).find("label").css("font-weight","300").css("text-decoration","none");
      });
      $(this).find("label").css("font-weight","bold").css("text-decoration","underline");
      UI.selectedComponent = this;
    })
    $("wire").click(function(){
      $(this).css("background-color","rgba(var(--bs-primary-rgb),var(--bs-bg-opacity))!important")
    })
  },
  Notification(type,message,details){
    var ctype = 'is-info'
    if(type == 'Success')
      ctype = 'is-success'
    else if(type == 'Warning')
      ctype = 'is-warning'
    else if(type == 'Error')
      ctype = 'is-danger'
    $("body #Notifications").append(`<div class="notification `+ctype+` is-light">
    <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>`+type+`</strong><br>
`+message+`<br>
<strong>Details:</strong><br>`+details+`</div>`);
  },
  VariableResistorChange(_vresist){
    $("input[name='vresistance']").slider();
    $("input[name='vresistance']").off();
    $("input[name='vresistance']").slider('value',$(_vresist).attr("data-spice-value"));
    const suffix = $(_vresist).data("spice-maxvalue").replace(/[0-9\.]/g,'');
    const maxVal = $(_vresist).data("spice-maxvalue").replace(/[^0-9\.]/g,'');
    $("#VariableResistor h5").html($(_vresist).attr("data-spice-value"));
    $("#VariableResistor").addClass("is-active");
    $("input[name='vresistance']").click(function(){
      console.log("Changing Value?");
      const newVal = ($(this).val()*maxVal)/100+suffix;
      $(_vresist).data("spice-value",newVal);
      $(_vresist).data("spice-analog-value",newVal);
      $("#VariableResistor h5").html(newVal);
      $(_vresist).attr("data-spice-value",newVal);
    })
  },
  SaveVariableResistance(){
    $("input[name='vresistance']").off('click');
  },
  RotateListen: function(){
    $("component").bind('click', function(event){ 
      if(event.altKey){
        if($(this).hasClass("rotated-90")){
          $(this).removeClass("rotated-90");
          $(this).addClass("rotated-180");
          $(this).removeClass("rotated-270");
          $(this).removeClass("rotated-0");
        }
        else if($(this).hasClass("rotated-180")){
          $(this).removeClass("rotated-90");
          $(this).removeClass("rotated-180");
          $(this).addClass("rotated-270");
          $(this).removeClass("rotated-0");
        }
        else if($(this).hasClass("rotated-270")){
          $(this).removeClass("rotated-180");
          $(this).removeClass("rotated-270");
          $(this).removeClass("rotated-90");
          $(this).addClass("rotated-0");
        }else if($(this).hasClass("rotated-0")){
          $(this).removeClass("rotated-180");
          $(this).removeClass("rotated-270");
          $(this).addClass("rotated-90");
          $(this).removeClass("rotated-0");
        }else{
          $(this).removeClass("rotated-180");
          $(this).removeClass("rotated-270");
          $(this).removeClass("rotated-90");
          $(this).addClass("rotated-0");
        }
      }
    }); 
  },
  DeleteListen: function(){
    $("wire").bind('click', function(event){ 
      console.log(event)
      if(event.altKey) {
        if($(this).attr("data-spice-revert-node") && $(this).attr("data-spice-revert-node") != $(this).attr("data-spice-node")){
          $(this).attr("data-spice-node",$(this).attr("data-spice-revert-node")).attr("data-tooltip",$(this).attr("data-spice-node"))
        }$(this).css("display","none").css("width","0px").css("height","0px").remove();
      }
    });
  },
  removeUnusedWires: function(){
    var wires = [];
    $("wire").each(function(){
      var _wire1 = this;
      var w1span = [{
        horizontal:[$(_wire1).offset().left,($(_wire1).offset().left+$(_wire1).width())],
        vertical:[$(_wire1).offset().top,($(_wire1).offset().top+$(_wire1).height())]
      }];
      $("wire").each(function(){
        var _wire2 = this;
        var w2span = [{
          horizontal:[$(_wire2).offset().left,($(_wire2).offset().left+$(_wire2).width())],
          vertical:[$(_wire2).offset().top,($(_wire2).offset().top+$(_wire2).height())]
        }];
        if($(_wire1).attr("id") != $(_wire2).attr("id"))
          if(w1span[0].horizontal[0] >= w2span[0].horizontal[0])
            if(w1span[0].vertical[0] >= w2span[0].vertical[0])
              if(w1span[0].horizontal[1] <= w2span[0].horizontal[1])
                if(w1span[0].vertical[1] <= w2span[0].vertical[1])
                  $(_wire1).hide();
      });
    })
  },
  Multimeter: function(){
    console.log("Simulating Circuit using Mulitmeter");
    UI.makeSPICE("multimeter",function(error){
      $("body #Notifications").append(`<div class="notification is-danger  is-light">
      <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>Error</strong><br>
There was an error simulating the circuit. Please check your circuit<br>
<strong>Details:</strong>`+error+`</div>`);
    },function(verbose){
      console.log(verbose);
    },function(netlist){
      console.log("Running Multimeter");
      console.log(netlist);
      $("body #Notifications").append(`<div class="notification is-info  is-light">
      <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>SPICE Circuit</strong><br>
The circuit is below
<strong>Details:</strong><br>`+netlist.split('\n').join('<br>')+`</div>`);
      window.electronAPI.SimulateCircuit(netlist)
    })
  },
  wire: function(){
    console.log("Wiring");
    $("wire,port").css("cursor","crosshair");
    $("body").css("cursor","default");
    //To start wiring, the student must click on a port or a wire
    $("wire").click(function(event){console.log("clicked wire"); if($(this).attr("data-spice-node") || $(this).attr("data-spice-node") == '0' || !$("meta[name='circuit']").data("framework")){
      $("port,wire,bind,body").unbind("click");
      console.log($(this).attr("data-spice-node"));
      console.log($(this).attr("data-spice-collapse-node"));
      console.log($(this).attr("data-spice-revert-node"));
      var spiceNode = " data-spice-node=\""+$(this).attr("data-spice-node")+"\"";
      if($(this).attr("data-spice-collapse-node"))
        spiceNode += " data-spice-collapse-node=\""+$(this).attr("data-spice-collapse-node")+"\"";
      if($(this).attr("data-spice-revert-node"))
        spiceNode += " data-spice-revert-node=\""+$(this).attr("data-spice-revert-node")+"\"";
      console.log(spiceNode);
      $("body").css("cursor","crosshair");
      var wireid = $('wire').length;
      var bindid = $('bind').length;
      while($("#wire"+wireid).length)
        wireid++;
      while($("#bind"+bindid).length)
        bindid++;
      var endbind = bindid+1;
      var left = Math.round(event.clientX/1)*1;
      var top = Math.round(event.clientY/1)*1;
      if(["PORT","WIRE"].includes($(event.currentTarget).prop("nodeName")))
        if($(event.currentTarget).width() == 6)
          left = $(event.currentTarget).offset().left;
        else if($(event.currentTarget).height() == 6)
          top = $(event.currentTarget).offset().top;
        else if($(event.currentTarget).height() > $(event.currentTarget).width())
          left = $(event.currentTarget).offset().left+$(event.currentTarget).width()/2;
        else
          top = $(event.currentTarget).offset().top+$(event.currentTarget).height()/2;
      if(!$("meta[name='circuit']").data("framework")){
        $("main").append("<bind id='bind"+bindid+"' style='z-index:14;display:inline-block;background:#333;position:absolute;width:10px;height:10px;'"+spiceNode+"></bind>");
        $("main").append("<bind id='bind"+endbind+"' style='z-index:14;display:inline-block;background:#333;position:absolute;width:10px;height:10px;'"+spiceNode+"></bind>");
        $("#bind"+bindid).show().offset({top:top-2,left:left-2});
        $("#bind"+endbind).hide().offset({top:top-2,left:left-2});
      }
      $("main").append("<wire id='wire"+wireid+"' style='z-index:13;display:inline-block;background:#333;position:absolute;'"+spiceNode+"></wire>");
      $("#wire"+wireid).show().offset({top:top,left:left});
      $(document).mousemove(function(event) {
        var cardinalOffset = [(top-event.clientY),(left-event.clientX),(event.clientY-top),(event.clientX-left)];
        peakDirection = cardinalOffset.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        var clientY = Math.round(event.clientY/1)*1;
        var clientX = Math.round(event.clientX/1)*1;
        switch(peakDirection) {
          case 0://cursor trending up
            $("#wire"+wireid+"").css("width","6px").css("height",(top-clientY)).css("top",(clientY)).css("left",left);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          case 1://cursor trending left
            $("#wire"+wireid+"").css("height","6px").css("width",(left-clientX)).css("top",(top)).css("left",clientX);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          case 2://cursor trending down
            $("#wire"+wireid+"").css("width","6px").css("height",(clientY-top)).css("top",top).css("left",left);
            $("#wire"+wireid+"").css("width","6px").css("height",(clientY-top)).css("top",top).css("left",left);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          case 3://cursor trending right
            $("#wire"+wireid+"").css("height","6px").css("width",(clientX-left)).css("top",top).css("left",left);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          default:
            void(0);
        }
      })
    }else{
      console.log("clicked on a wire but it doesn't have a spice node?")
    }
  });
  $("body").dblclick(function(event){
    var wireid = $('wire').length;
    while($("#wire"+wireid).length)
      wireid++;
    wireid--;
    console.log(event.target.id)
    console.log(event.target.nodeName.toLocaleLowerCase());
    console.log(wireid);
    if(event.target.nodeName.toLocaleLowerCase() == "wire"){
      console.log("clicked on a wire")
      if($("#"+event.target.id).attr("data-spice-node") == $("#wire"+wireid).attr("data-spice-node")){
        console.log("You're allowed to join these nodes");
        //UI.Notification("Success","These nodes can be joined!","These wires were already on the same node.");
      }else if($("#"+event.target.id).data("spice-collapse-node") || $("#wire"+wireid).data("spice-collapse-node")){
        console.log("Collapsing the node");
        var supernode = $("#"+event.target.id).attr("data-spice-node")
        if(!$("#wire"+wireid).data("spice-collapse-node"))
          supernode = $("#wire"+wireid).attr("data-spice-node");
        console.log(supernode);
        $("wire[data-spice-node='"+$("#"+event.target.id).attr("data-spice-node")+"']").attr("data-spice-node",supernode);
        $("wire[data-spice-node='"+$("#wire"+wireid).attr("data-spice-node")+"']").attr("data-spice-node",supernode);
      }else{
        console.log("You can't join these wires");
        $("#wire"+wireid).css("display","node").css("width","0px").css("height","0px").remove();
      }
    }else if(event.target.nodeName.toLocaleLowerCase() == "port"){
      $(event.target.id).attr("data-spice-node",$("#wire"+wireid).attr("data-spice-node"));
    }
    $(document).off("mousemove");
    $("body").off("dblclick");
    $("wire").off("click");
    UI.wire();
  });
  },
  ComponentDrop: function(){
    $("component").mouseup(function(event){
      const _comp = this;
      $("wire").each(function(){
        if($(this).is(":visible") && $(this).width() > 0 && $(this).height() > 0){
        const _wire = this;
        $(_comp).find("port").each(function(){
          const _port = this;
          $(_port).attr("data-spice-node","999");
          const Component = [{
            horizontal:[$(_comp).offset().left,($(_comp).offset().left+$(_comp).width())],
            vertical:[$(_comp).offset().top,($(_comp).offset().top+$(_comp).height())]
          }];
          var InterPortSpace = [];
          $(_comp).find(".InterPortSpace").each(function(){
            InterPortSpace.push({
              horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
              vertical:[$(this).offset().top,($(this).offset().top+$(this).height())]
            })
          })
          var wired = false;
          var portWidth = $(_port).width();
          var portHeight = $(_port).height();
          if($(_comp).hasClass("rotated-90") || $(_comp).hasClass("rotated-270")){
            portWidth = $(_port).height();
            portHeight = $(_port).width();
            InterPortSpace = [];
            $(_comp).find(".InterPortSpace").each(function(){
              InterPortSpace.push({
                horizontal:[$(this).offset().left,($(this).offset().left+$(this).height())],
                vertical:[$(this).offset().top,($(this).offset().top+$(this).width())]
              });
            });
          }
          var hasIPS = false;
          if($(_comp).find(".InterPortSpace").width() > 0 && $(_comp).find(".InterPortSpace").height() > 0)
            hasIPS = true;
          const Port = [{
            horizontal:[$(_port).offset().left,($(_port).offset().left+portWidth)],
            vertical:[$(_port).offset().top,($(_port).offset().top+portHeight)]
          }];
          if($(_wire).width() == 0 || $(_wire).height() == 0) $(_wire).hide();
          var wirespan = [{
            horizontal:[$(_wire).offset().left,($(_wire).offset().left+$(_wire).width())],
            vertical:[$(_wire).offset().top,($(_wire).offset().top+$(_wire).height())]
          }];
          if(UI.inSpan(Port,wirespan) && !wired){
            console.log("Dropping Component on a wire");
            wired = true;    
            $(_port).attr("data-spice-node",$(_wire).attr("data-spice-node"));
            if($(_wire).height() == 6 && portHeight == 6){
              var heightDiff = $(_port).offset().top - $(_wire).offset().top;
              $(_comp).css("top",($(_comp).offset().top-heightDiff));
              if(hasIPS && !$("meta[name='circuit']").data("framework"))
                UI.SplitWire(("#"+$(_wire).attr("id")),InterPortSpace);
            }else if($(_wire).width() == 6 && portWidth == 6){
              var widthDiff = $(_port).offset().left-$(_comp).offset().left;
              $(_comp).css("left",($(_wire).offset().left-widthDiff));
              if(hasIPS && !$("meta[name='circuit']").data("framework"))
                UI.SplitWire(("#"+$(_wire).attr("id")),InterPortSpace);
            }
          }
        })
      }})
    })
  },
 RemoveWiresFromArea: function(span){
    $("wire").each(function(){
      const Component = [{
          horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
          vertical:[$(this).offset().top,($(this).offset().top+$(this).height())]
        }];
      if(UI.inSpan(span,Component)) $(this).hide();
    })
  },
  OverlapPoint: function(node,wire){
    var left = Math.abs(wire[0].horizontal[0]-wire[0].horizontal[1]);
    var top = Math.abs(wire[0].vertical[0]-wire[0].vertical[1]);
    var bottom = Math.abs(wire[0].horizontal[1]-wire[0].horizontal[0]);
    var right = Math.abs(wire[0].vertical[1]-wire[0].vertical[0]);
  },
  inSpan: function(spans1,spans2){
    if(spans1) for(var s1 of spans1)
      if(spans2) for(var s2 of spans2)
        //Horizontally aligned
        if(UI.rectanglesIntersect(
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
  rectanglesIntersect: function(minAx,minAy,maxAx,maxAy,minBx,minBy,maxBx,maxBy ) {
    var aLeftOfB = maxAx < minBx;
    var aRightOfB = minAx > maxBx;
    var aAboveB = minAy > maxBy;
    var aBelowB = maxAy < minBy;
    return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );
  },
  saveBoard: function(){
    localStorage.setItem("board",$("main").html())
  },
  loadBoard: function(){
    $("main").html(localStorage.getItem("board"));
    $("component").draggable({ containment: "parent" });
    UI.select();
  },
  makeSPICE: function(type,debugFunction,verboseFunction,callback){
    UI.nodes = [];
    UI.components = [];
    const powersupply = [{
      voltage:parseFloat($("#Source td[name='voltage1']").html()),
      positive:$("port[name='powersupply-1-positive']").attr("data-spice-node"),
      negative:$("port[name='powersupply-1-negative']").attr("data-spice-node")

    },{
      voltage:parseFloat($("#Source td[name='voltage2']").html()),
      positive:$("port[name='powersupply-2-positive']").attr("data-spice-node"),
      negative:$("port[name='powersupply-2-negative']").attr("data-spice-node")
    }];
    const signalgenerator = {
      freqMultiple:$("#SignalGenerator td[name='frequency']").html().split(" ").pop(),
      voltage:parseFloat($("#SignalGenerator td[name='voltage']").html()),
      frequency:parseFloat($("#SignalGenerator td[name='frequency']").html()),
      waveType:"sine",
      positive:$("port[name='signalgenerator-positive']").attr("data-spice-node"),
      negative:$("port[name='signalgenerator-negative']").attr("data-spice-node")
    };
    const oscilloscope = [{
      line:$("#Oscilloscope input[name='simulation-line']").val(),
      transformation:{
        type:$("#Oscilloscope form[name='scope1-transformation'] input[name='type']:checked").val(),
        factor:$("#Oscilloscope form[name='scope1-transformation'] input[name='factor']").val()
      },
      positive:$("port[name='oscilloscope-1-positive']").attr("data-spice-node"),
      negative:$("port[name='oscilloscope-1-negative']").attr("data-spice-node")
    },{
      line:$("#Oscilloscope input[name='simulation-line']").val(),
      transformation:{
        type:$("#Oscilloscope form[name='scope2-transformation'] input[name='type']:checked").val(),
        factor:$("#Oscilloscope form[name='scope2-transformation'] input[name='factor']").val()
      },
      positive:$("port[name='oscilloscope-2-positive']").attr("data-spice-node"),
      negative:$("port[name='oscilloscope-2-negative']").attr("data-spice-node")
    }];
    const ground = $("ground port").attr("data-spice-node")
    var multimeternodes = [];
    $("wire").each(function(){
      if($(this).attr("data-spice-node"))
        multimeternodes.push($(this).attr("data-spice-node"));
    })
    $("component[data-spice-type='Ammeter']").each(function(){
      multimeternodes.push({'+':$(this).find("port[name='+']").attr("data-spice-node"),'-':$(this).find("port[name='+']").attr("data-spice-node"),'value':$(this).data("spice-value")})
    })
    multimeternodes = [...new Set(multimeternodes)];
    if(signalgenerator.freqMultiple == "kHz")
      signalgenerator.frequency = signalgenerator.frequency*1000;
    $("#SignalGenerator .type a").each(function(){
      if($(this).hasClass("is-info"))
        signalgenerator.waveType = $(this).attr("name");
    })
    if($("meta[name='circuit']").data("framework")){
      var scopenodes = {positive:null,negative:null};
      $("wire").each(function(){
        var nodeExists = false;
        var node = $(this).attr("data-spice-node");
        if(!UI.nodes.hasOwnProperty(node))
          UI.nodes[node] = {name:node,span:[]}
      });
        $("component").each(function(){
          var component = {
            name:$(this).data("spice-name"),
            position:$(this).offset(),
            width:$(this).width(),
            height:$(this).height(),
            type:$(this).data("spice-type"),
            value:$(this).data("spice-value"),
            nodes:[],
            ports:[]
          };
          $(this).find("port").each(function(){
            component.ports.push({
              name:$(this).attr("name"),
              position:$(this).offset(),
              SpicePosition:parseInt($(this).data("spice-position")),
              width:$(this).width(),
              height:$(this).height(),
              nodes:[$(this).attr("data-spice-node")]
            });
          });
          UI.components.push(component);
        });
      var nodes = [];
      for(var n in UI.nodes)
        nodes.push(UI.nodes[n]);
      this.SPICE = new SPICE(powersupply,signalgenerator,oscilloscope,ground,nodes,UI.components,null,null,null,scopenodes,multimeternodes,$("meta[name='circuit']").data("subcircuit"),$("meta[name='circuit']").data("models"),$("meta[name='circuit']").data("simulationparams"),debugFunction,verboseFunction,callback);
    }else{
    var wires = [];
    var parts = [];
    var binds = [];
    $("wire,port").each(function(){
      var id = null;
      if($(this)[0].localName == "port") 
        id = $(this).parent().data("spice-name")+"-"+$(this).data("spice-name");
      else if($(this)[0].localName == "wire") 
        id = $(this).attr("id");
      if($(this).parent()[0].localName == "component" || $(this).parent()[0].localName == "ground" || $(this)[0].localName == "wire" || $(this).parent()[0].localName == "connectors")
        if($(this).is(":visible") && $(this).width() > 0 && $(this).height() > 0)
          if($(this).parent().hasClass("rotated-90") || $(this).parent().hasClass("rotated-270"))
            wires.push({
              id:id,
              type:$(this)[0].localName,
              position:$(this).offset(),
              width:$(this).height(),
              height:$(this).width(),
              connected:[],
              span:[],
              segments:[]
            });
          else
            wires.push({
              id:id,
              type:$(this)[0].localName,
              position:$(this).offset(),
              width:$(this).width(),
              height:$(this).height(),
              connected:[],
              span:[],
              segments:[]
            });
      });
    $("component").each(function(){
      var component = {
        name:$(this).data("spice-name"),
        position:$(this).offset(),
        width:$(this).width(),
        height:$(this).height(),
        type:$(this).data("spice-type"),
        ports:[]
      };
      $(this).find("port").each(function(){
        component.ports.push({
          name:$(this).data("spice-name"),
          position:$(this).offset(),
          width:$(this).width(),
          height:$(this).height(),
        });
      });
      parts.push(component);
    });
    $("bind").each(function(){
      const bindspan = [{
        horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
        vertical:[$(this).offset().top,($(this).offset().top+$(this).height())]
      }];
      binds.push({
        id:$(this).attr("id"),
        span:bindspan,
      })
    });
    try{
      this.SPICE = new SPICE(powersupply,signalgenerator,oscilloscope,ground,null,null,wires,binds,parts,null,null,$("meta[name='circuit']").data("models"),$("meta[name='circuit']").data("simulationparams"),debugFunction,verboseFunction,UI.SimulateCircuit);
    }catch(e){
      debugFunction("<b>Error:</b> "+e);
    }
  }
  },
  revealNode: function(n,colour,name){
    if(typeof(name) == "string")
      if(name == '0')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (ground node)</p>");
      else if(name == 'a')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (powersupply 1 +)</p>");
      else if(name == 'b')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (powersupply 1 -)</p>");
      else if(name == 'c')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (powersupply 2 +)</p>");
      else if(name == 'd')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (powersupply 2 -)</p>");
      else if(name == 'e')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (signalgenerator +)</p>");
      else if(name == 'f')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (signalgenerator -)</p>");
      else if(name == 'g')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (oscilloscope +)</p>");
      else if(name == 'h')
        $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (oscilloscope -)</p>");
      else
      $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+" (other)</p>");
    else
      $("#nodelabel").append("<p><div style='display:inline-block;width:50px;height:6px;background:"+colour+";'></div> Node "+name+"</p>");
    for(var i of UI.SPICE.nodes[n].span){
      var top = i.vertical[0];
      var left = i.horizontal[0];
      var height = i.vertical[1]-top;
      var width = i.horizontal[1]-left;
      var positionParams = "top:"+top+"px;left:"+left+"px;height:"+height+"px;width:"+width+"px;"
      $("body").append("<div class='reveal' style='z-index:15;position:absolute;background:"+colour+";"+positionParams+"'></div>");
    }
  },
  showNodes: function(){
    $("main").append("<div style='z-index:16;position:absolute;top:0px;right:0px;width:400px;background:#fff;border:1px solid #333;min-height:200px;font-size:10px;' id='nodelabel'></div>")
    const colours = ["green","blue","yellow","orange","purple","brown","beige","aqua","blueviolet","darkcyan"]
    for(var i=0;i<UI.SPICE.nodes.length;i++) 
      UI.revealNode(i,colours[i],UI.SPICE.nodes[i].name)
  },
  hideNodes: function(){
    $("#nodelabel").remove();
    $("body").find(".reveal").remove();
  }
}
$("connectors port").each(function(){
  var _port = this;
  const PortSpan = [{
    horizontal:[$(_port).offset().left,($(_port).offset().left+$(_port).width())],
    vertical:[$(_port).offset().top,($(_port).offset().top+$(_port).height())]
  }];
  $("wire").each(function(){
    var _wire = this;
    const WireSpan = [{
      horizontal:[$(_wire).offset().left,($(_wire).offset().left+$(_wire).width())],
      vertical:[$(_wire).offset().top,($(_wire).offset().top+$(_wire).height())]
    }];
    if(UI.inSpan(PortSpan,WireSpan))
      if($(_wire).attr("data-spice-node"))
        $(_port).attr("data-spice-node",$(_wire).attr("data-spice-node"));
  })
})