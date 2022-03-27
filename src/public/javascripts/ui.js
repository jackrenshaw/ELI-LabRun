
/*

*/
var UI = {
  Page:null,
  FrameWork: $("meta[name='wireframe']").attr("content"),
  portPositionsX: [75,175,275,375,600,700,1000,1150], // X positions of left side of ports (signal generator, supply, oscilloscope)
  gridPositionsX: [],//X position of 
  selectedComponent:null,
  selectedWire:null,
  SPICE:null,
  nodes:[],
  clear: function(){
    //clear all bindings, start from a blank slate
    $("component,ground").draggable('disable');
    $("body,component,ground").css("cursor","default");
    $("component").off("dblclick");
    $("wire").off("dblclick");
    $("port").off("dblclick");
    $("body").off("dblclick");
    $("body").off("click");
    $("port").off("click");
    $("wire").off("click");
    $(document).off("mousemove");
  },
  select: function(){
    //
    UI.clear();
    $("component,ground").css("cursor","pointer");
    UI.SelectListen();
    UI.RotateListen();
    UI.ComponentDrop();
  },
  move: function(){
    //Move the component
    UI.clear();
    $("component,ground").css("cursor","grab");
    $("component,ground").draggable('enable');
    UI.ComponentDrop();
  },
  remove: function(){
    //When clicked, each wire will be 
    console.log("Removing a Wire");
    UI.clear();
    $("wire,bind").css("cursor","not-allowed");
    $("wire,bind,component").click(function(){
      $(this).remove();
      UI.remove();
    })
  },
  SelectListen: function(){
    $("component,ground").click(function(){
      $("component,ground").each(function(){ 
        $(this).draggable('disable');
        $(this).find("label").css("font-weight","300").css("text-decoration","none");
      });
      $(this).find("label").css("font-weight","bold").css("text-decoration","underline");
      UI.selectedComponent = this;
      $(this).draggable('enable');
    })
    $("wire").click(function(){
      $(this).css("background-color","rgba(var(--bs-primary-rgb),var(--bs-bg-opacity))!important")
    })
  },
  VariableResistorChange(_vresist){
    console.log("Changing Variable Resistance Value");
    const suffix = $(_vresist).data("spice-maxvalue").replace(/[0-9\.]/,'');
    const maxVal = $(_vresist).data("spice-maxvalue").replace(/[^0-9\.]/,'');
    $("#VariableResistor h5").html($(_vresist).data("spice-maxvalue"));
    $("#VariableResistor").addClass("is-active");
    $("input[name='vresistance']").click(function(){
      console.log("Changing Value?");
      const newVal = ($(this).val()*maxVal)/100+suffix;
      $(_vresist).data("spice-value",newVal);
      $("#VariableResistor h5").html(newVal);
    })
    $(this).data("spice-value","10k");
  },
  SaveVariableResistance(){
    $("input[name='vresistance']").off('click');
  },
  RotateListen: function(){
    $(document).on("keypress", function(e) { 
      if(e.key == "®" && UI.selectedComponent)
        if($(UI.selectedComponent).hasClass("rotated-90")){
          $(UI.selectedComponent).removeClass("rotated-90");
          $(UI.selectedComponent).addClass("rotated-180");
          $(UI.selectedComponent).removeClass("rotated-270");
        }
        else if($(UI.selectedComponent).hasClass("rotated-180")){
          $(UI.selectedComponent).removeClass("rotated-90");
          $(UI.selectedComponent).removeClass("rotated-180");
          $(UI.selectedComponent).addClass("rotated-270");
        }
        else if($(UI.selectedComponent).hasClass("rotated-270")){
          $(UI.selectedComponent).removeClass("rotated-180");
          $(UI.selectedComponent).removeClass("rotated-270");
          $(UI.selectedComponent).removeClass("rotated-90");
        }else{
          $(UI.selectedComponent).removeClass("rotated-180");
          $(UI.selectedComponent).removeClass("rotated-270");
          $(UI.selectedComponent).addClass("rotated-90");
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
  StartMultimeter: function(){
    UI.clear();
    console.log("Starting Multimeter");
    $("wire").click(function(event){
      var mmid = $('multimeter').length;
      while($("#multimeter"+mmid).length)
        mmid++;
      $("#MultimeterFlags").append(`<multimeter style="position:absolute;top:`+(event.clientY-20)+`px;left:`+(event.clientX-4)+`px;" data-spice-node="`+$(this).data("spice-node")+`" id="multimeter+`+mmid+`"><span class="material-icons">outlined_flag</span></multimeter>`);
    })
  },
  StopMultimeter: function(){
    console.log("Stopping Multimeter");
    console.log("Simulating Circuit using Mulitmeter");
    UI.makeSPICE(function(error){
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
      window.electronAPI.RunMultimeter(netlist)
    })
  },
  wire: function(){
    console.log("Wiring");
    UI.clear();
    $("wire,port").css("cursor","crosshair");
    $("body").css("cursor","default");
    //To start wiring, the student must click on a port or a wire
    $("wire").click(function(event){ if($(this).data("spice-node") || $(this).data("spice-node") == '0' || !UI.FrameWork){
      $("port,wire,bind,body").unbind("click");
      console.log($(this).data("spice-node"));
      var spiceNode = "";
      if(UI.FrameWork)
        spiceNode = " data-spice-node=\""+$(this).data("spice-node")+"\"";
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
      if(!UI.FrameWork){
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
            if(UI.gridPositionsX.includes(clientX))
              for(var g of UI.portPositionsX)
                if(Math.abs(clientX-g)<20){
                  clientX = g+3;
                  break;
                }
            $("#wire"+wireid+"").css("height","6px").css("width",(left-clientX)).css("top",(top)).css("left",clientX);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          case 2://cursor trending down
            $("#wire"+wireid+"").css("width","6px").css("height",(clientY-top)).css("top",top).css("left",left);
            $("#wire"+wireid+"").css("width","6px").css("height",(clientY-top)).css("top",top).css("left",left);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          case 3://cursor trending right
            if(UI.gridPositionsX.includes(clientX))
              for(var g of UI.portPositionsX)
                if(Math.abs(clientX-g)<20){
                  clientX = g+3;
                  break;
                }
            $("#wire"+wireid+"").css("height","6px").css("width",(clientX-left)).css("top",top).css("left",left);
            $("#bind"+endbind+"").css("top",clientY-4).css("left",clientX-4);
            break;
          default:
            void(0);
        }
      })
    }
  });
  $("component,port").dblclick(function(){
    console.log("wiring to a port");
    $(this).attr("data-spice-node",$("#wire"+wireid).data("spice-node"));
    if($(this).data("spice-node") != $(this).data("spice-target-node"))
      $("body #Notifications").html(`<div class="notification is-warning is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Warning</strong><br>This component is miswired!</div>`);          
    $(document).unbind("click");
    $("body,port,wire").unbind("click");
    $(document).unbind("mousemove");
    UI.wire();
  })
  $("body").dblclick(function(){
    $(document).unbind("click");
    $("body,port,wire").unbind("click");
    $(document).unbind("mousemove");
    UI.wire();
  });
  },
  ComponentDrop: function(){
    $("component,ground").mouseup(function(event){
      const _comp = this;
      $("wire").each(function(){
        if($(this).is(":visible") && $(this).width() > 0 && $(this).height() > 0){
        const _wire = this;
        $(_comp).find("port").each(function(){
          const _port = this;
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
          if(UI.inSpan(Port,wirespan) && !wired && $(_port).data("bind-position")){
            console.log("Dropping Component on a wire");
            wired = true;
            $(_port).attr("data-spice-node",$(_wire).data("spice-node"));
            console.log($(_port).data("spice-node"))
            if($(_port).data("spice-node") == $(_port).data("spice-target-node"))
              $("body #Notifications").html(`<div class="notification is-success is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Success!</strong><br>The component was placed in the correct position</div>`);          
            else
              $("body #Notifications").html(`<div class="notification is-warning is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Warning</strong><br>This component is misplaced</div>`);          
            var bindPosition = $(_port).data("bind-position");
            if($(_wire).height() == 6 && portHeight == 6){
              var heightDiff = $(_port).offset().top - $(_wire).offset().top;
              $(_comp).css("top",($(_comp).offset().top-heightDiff));
              if(hasIPS && !UI.FrameWork)
                UI.SplitWire(("#"+$(_wire).attr("id")),InterPortSpace);
            }else if($(_wire).width() == 6 && portWidth == 6){
              var widthDiff = $(_port).offset().left-$(_comp).offset().left;
              $(_comp).css("left",($(_wire).offset().left-widthDiff));
              if(hasIPS && !UI.FrameWork)
                UI.SplitWire(("#"+$(_wire).attr("id")),InterPortSpace);
            }/*else if($(_wire).height() == 6 && portWidth == 6){
              var newPosition = $(_wire).offset().top - ($(_port).offset().top - $(_comp).offset().top) - bindPosition.top;
              $(_comp).css("top",newPosition);
              if(hasIPS && !UI.FrameWork)
                UI.SplitWire(("#"+$(_wire).attr("id")),InterPortSpace);
            }else if($(_wire).width() == 6 && portHeight == 6){
              var widthDiff = $(_port).offset().left-$(_comp).offset().left;
              $(_comp).css("left",($(_wire).offset().left-widthDiff));
              if(hasIPS && !UI.FrameWork)
                UI.SplitWire(("#"+$(_wire).attr("id")),InterPortSpace);
            }*/
          }else if(UI.inSpan(Port,wirespan) && wired){
            if($(_wire).height() == 6 && portHeight == 6)
              UI.AddBind(Port,$(_port).data("bind-position"))
            else if($(_wire).width() == 6 && portWidth == 6)
              UI.AddBind(Port,$(_port).data("bind-position"))
            else if($(_wire).height() == 6 && portWidth == 6)
              UI.AddBind(Port,$(_port).data("bind-position"))
            else if($(_wire).width() == 6 && portHeight == 6)
              UI.AddBind(Port,(_port).data("bind-position"))
          }
        })
      }})
    })
  },
  SplitWire: function(wireid,splitspan){
    console.log(splitspan);
    var wirespan = [{
      horizontal:[$(wireid).offset().left,($(wireid).offset().left+$(wireid).width())],
      vertical:[$(wireid).offset().top,($(wireid).offset().top+$(wireid).height())]
    }];
    var newSpan = [];
    for(var s of splitspan)
    if($(wireid).height() == 6){
      newSpan = [{
        horizontal:[wirespan[0].horizontal[0],s.horizontal[0]],
        vertical:[wirespan[0].vertical[0],wirespan[0].vertical[1]],
      },{
        horizontal:[s.horizontal[1],wirespan[0].horizontal[1]],
        vertical:[wirespan[0].vertical[0],wirespan[0].vertical[1]],
      }];
    }else if($(wireid).width() == 6){
      newSpan = [{
        vertical:[wirespan[0].vertical[0],s.vertical[0]],
        horizontal:[wirespan[0].horizontal[0],wirespan[0].horizontal[1]],
      },{
        vertical:[s.vertical[1],wirespan[0].vertical[1]],
        horizontal:[wirespan[0].horizontal[0],wirespan[0].horizontal[1]],
      }];
    }
    $(wireid).hide();
    UI.AddWire(newSpan);
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
  RemoveWireSection: function(originalSection,nullSection){
    if(Math.abs(originalSection[0].vertical[0]-nullSection[0].vertical[0])<6 && Math.abs(originalSection[0].vertical[1] - nullSection[0].vertical[1]) < 6){
      UI.AddWire([{
        horizontal:[originalSection[0].horizontal[0],nullSection[0].horizontal[0]],
        vertical:[originalSection[0].vertical[0],originalSection[0].vertical[1]]
      }])
      UI.AddWire([{
        horizontal:[nullSection[0].horizontal[1],originalSection[0].horizontal[1]],
        vertical:[originalSection[0].vertical[0],originalSection[0].vertical[1]]
      }])
    }else if(Math.abs(originalSection[0].horizontal[0] - nullSection[0].horizontal[0]) < 6 && Math.abs(originalSection[0].horizontal[1] - nullSection[0].horizontal[1]) < 6){
      UI.AddWire({
        horizontal:[originalSection[0].horizontal[0],originalSection[0].horizontal[1]],
        vertical:[originalSection[0].vertical[0],nullSection[0].vertical[0]]
      })
      UI.AddWire([{
        horizontal:[originalSection[0].horizontal[0],originalSection[0].horizontal[1]],
        vertical:[nullSection[0].vertical[1],originalSection[0].vertical[1]]
      }])
    }
  },
  AddWire: function(span){
    if(span)
      if(span.length)
        for(var s of span)
          if(s.hasOwnProperty("horizontal") && s.hasOwnProperty("vertical")){
            const wireid = $("wire").length;
            const top = "top:"+s.vertical[0]+"px;";
            const height = "height:"+(s.vertical[1]-s.vertical[0])+"px;";
            const left = "left:"+s.horizontal[0]+"px;"
            const width = "width:"+(s.horizontal[1]-s.horizontal[0])+"px;";
            $("main").append("<wire id='wire"+wireid+"' style='z-index:13;display:inline-block;background:#333;position:absolute;"+top+left+width+height+"'></wire>");
          }
  },
  AddBind: function(port,position){
    var left = port[0].horizontal[0]+position.left;
    var top = port[0].vertical[0]+position.top;
    const bindid = $("bind").length;
    $("main").append("<bind id='bind"+bindid+"' style='z-index:14;display:inline-block;background:#333;position:absolute;width:10px;height:10px;'></bind>");
    $("#bind"+bindid).show().offset({top:top-2,left:left-2});
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
    $("component,ground").draggable();
    UI.move();
  },
  makeSPICE: function(debugFunction,verboseFunction,callback){
    UI.nodes = [];
    UI.components = [];
    const powersupply = [{
      voltage:parseFloat($("#Source td[name='voltage1']").html()),
      positive:{
        span:[{
          vertical:[$("port[name='powersupply-1positive").offset().top,($("port[name='powersupply-1positive").offset().top+$("port[name='powersupply-1positive").height())],
          horizontal:[$("port[name='powersupply-1positive").offset().left,($("port[name='powersupply-1positive").offset().left+$("port[name='powersupply-1positive").width())],
        }]
      },
      negative:{
        span:[{
          vertical:[$("port[name='powersupply-1negative").offset().top,($("port[name='powersupply-1negative").offset().top+$("port[name='powersupply-1negative").height())],
          horizontal:[$("port[name='powersupply-1negative").offset().left,($("port[name='powersupply-1negative").offset().left+$("port[name='powersupply-1negative").width())],
        }]
      }
    },{
      voltage:parseFloat($("#Source td[name='voltage1']").html()),
      positive:{
        span:[{
          vertical:[$("port[name='powersupply-2positive").offset().top,($("port[name='powersupply-2positive").offset().top+$("port[name='powersupply-2positive").height())],
          horizontal:[$("port[name='powersupply-2positive").offset().left,($("port[name='powersupply-2positive").offset().left+$("port[name='powersupply-2positive").width())],
        }]
      },
      negative:{
        span:[{
          vertical:[$("port[name='powersupply-2negative").offset().top,($("port[name='powersupply-2negative").offset().top+$("port[name='powersupply-2negative").height())],
          horizontal:[$("port[name='powersupply-2negative").offset().left,($("port[name='powersupply-2negative").offset().left+$("port[name='powersupply-2negative").width())],
        }]
      }
    }];
    const signalgenerator = {
      freqMultiple:$("#SignalGenerator td[name='frequency']").html().split(" ").pop(),
      voltage:parseFloat($("#SignalGenerator td[name='voltage']").html()),
      frequency:parseFloat($("#SignalGenerator td[name='frequency']").html()),
      waveType:"sine",
      positive:{
        span:[{
          vertical:[$("port[name='signalgenerator-positive").offset().top,($("port[name='signalgenerator-positive").offset().top+$("port[name='signalgenerator-positive").height())],
          horizontal:[$("port[name='signalgenerator-positive").offset().left,($("port[name='signalgenerator-positive").offset().left+$("port[name='signalgenerator-positive").width())],
        }]
      },
      negative:{
        span:[{
          vertical:[$("port[name='signalgenerator-negative").offset().top,($("port[name='signalgenerator-negative").offset().top+$("port[name='signalgenerator-negative").height())],
          horizontal:[$("port[name='signalgenerator-negative").offset().left,($("port[name='signalgenerator-negative").offset().left+$("port[name='signalgenerator-negative").width())],
        }]
      }
    };
    const oscilloscope = {
      params:{
        type:UI.SimulationParams.type,
        transient:{
          runtime:$("#scope-transient input[type='text']").val(),
          step:$("#scope-transient span.simulation-step").html(),
        },
        sweep:{
          type:$("#scope-sweep input[type='radio']:checked").val(),
          step:$("#scope-sweep span.steps-per-interval").html(),
          start:$("#scope-sweep span.sweep-start-frequency").html(),
          stop:$("#scope-sweep span.sweep-stop-frequency").html(),
        }
      },
      positive:{
        span:[{
          vertical:[$("port[name='oscilloscope-positive").offset().top,($("port[name='oscilloscope-positive").offset().top+$("port[name='oscilloscope-positive").height())],
          horizontal:[$("port[name='oscilloscope-positive").offset().left,($("port[name='oscilloscope-positive").offset().left+$("port[name='oscilloscope-positive").width())],
        }]
      },
      negative:{
        span:[{
          vertical:[$("port[name='oscilloscope-negative").offset().top,($("port[name='oscilloscope-negative").offset().top+$("port[name='oscilloscope-negative").height())],
          horizontal:[$("port[name='oscilloscope-negative").offset().left,($("port[name='oscilloscope-negative").offset().left+$("port[name='oscilloscope-negative").width())],
        }]
      }
    };
    const ground = {
      span:[{
        vertical:[$("ground port").offset().top,($("ground port").offset().top+$("ground port").height())],
        horizontal:[$("ground port").offset().left,($("ground port").offset().left+$("ground port").width())],
      }]
    };
    var multimeternodes = [];
    $("multimeter").each(function(){
      if($(this).data("spice-node"))
      multimeternodes.push($(this).data("spice-node"));
    })
    $("component[data-spice-type='Ammeter']").each(function(){
      multimeternodes.push({'+':$(this).find("port[name='+']").data("spice-node"),'-':$(this).find("port[name='+']").data("spice-node"),'value':$(this).data("spice-value")})
    })
    multimeternodes = [...new Set(multimeternodes)];
    console.log(multimeternodes);
    if(signalgenerator.freqMultiple == "kHz")
      signalgenerator.frequency = signalgenerator.frequency*1000;
    $("#SignalGenerator .type a").each(function(){
      if($(this).hasClass("is-info"))
        signalgenerator.waveType = $(this).attr("name");
    })
    if(UI.FrameWork){
      var scopenodes = {positive:null,negative:null};
      $("wire").each(function(){
        var nodeExists = false;
        var node = $(this).data("spice-node");
        if(!UI.nodes.hasOwnProperty(node))
          UI.nodes[node] = {name:node,span:[]}
        if(node || node == 0){
          UI.nodes[node].span.push({
            horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
            vertical:[$(this).offset().top,($(this).offset().top+$(this).height())],
          });

        if($(this).data("spice-scope"))
          if($(this).data("spice-scope") == '+')
            scopenodes.positive = $(this).data("spice-node");
          else if($(this).data("spice-scope") == '-')
            scopenodes.negative = $(this).data("spice-node");
        }
      });
        $("component").each(function(){
          var component = {
            name:$(this).data("spice-name"),
            position:$(this).offset(),
            width:$(this).width(),
            height:$(this).height(),
            type:$(this).data("spice-type"),
            value:$(this).data("spice-value"),
            span:[{
              horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
              vertical:[$(this).offset().top,($(this).offset().top+$(this).height())],
            }],
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
              span:[{
                horizontal:[$(this).offset().left,($(this).offset().left+$(this).width())],
                vertical:[$(this).offset().top,($(this).offset().top+$(this).height())],
              }],
              nodes:[$(this).data("spice-node")]
            });
          });
          UI.components.push(component);
        });
      for(var n of UI.nodes){
        if(UI.inSpan(n.span,oscilloscope.positive.span))
          scopenodes.positive = n.name
        if(UI.inSpan(n.span,oscilloscope.negative.span))
          scopenodes.negative = n.name
      }
      var nodes = [];
      for(var n in UI.nodes)
        nodes.push(UI.nodes[n]);
      this.SPICE = new SPICE(powersupply,signalgenerator,oscilloscope,ground,nodes,UI.components,null,null,null,scopenodes,multimeternodes,UI.Subcircuit,UI.Models,UI.SimulationParams,debugFunction,verboseFunction,callback);
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
      this.SPICE = new SPICE(powersupply,signalgenerator,oscilloscope,ground,null,null,wires,binds,parts,null,null,UI.Models,UI.SimulationParams,debugFunction,verboseFunction,UI.SimulateCircuit);
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
  $(this).height("200px")
  $("wire").each(function(){
    var _wire = this;
    const WireSpan = [{
      horizontal:[$(_wire).offset().left,($(_wire).offset().left+$(_wire).width())],
      vertical:[$(_wire).offset().top,($(_wire).offset().top+$(_wire).height())]
    }];
    if(UI.inSpan(PortSpan,WireSpan))
      if($(_wire).data("spice-node"))
        $(_port).attr("data-spice-node",$(_wire).data("spice-node"));
  })
})
$("connectors div").each(function(){
  $(this).height("200px")
})