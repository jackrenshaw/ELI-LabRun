/*
  UI Object
  ---------
*/
var UI = {
  SPICE: null,
  nodes: [],
  SET: function () {
    $(".modal .modal-card-foot button:contains(Close),button[aria-label='close'],div.modal-background").click(function () {
      $(".modal").removeClass("is-active");
    })
    if ($("wire[data-spice-node='0']").width() == '6')
      $("ground").offset({ top: $("wire[data-spice-node='0']").offset().top + ($("wire[data-spice-node='0']").height() - 10), left: $("wire[data-spice-node='0']").offset().left - 20 })
    else
      $("ground").offset({ top: $("wire[data-spice-node='0']").offset().top + $("wire[data-spice-node='0']").height() - 10, left: $("wire[data-spice-node='0']").offset().left - 20 })
    $(document).on('keyup', function (e) {
      if (e.key == "Escape") $(".modal").removeClass("is-active");
    });
    $("component[disabled!='disabled']").draggable({ containment: "body" });
    $("component[disabled!='disabled']").css("cursor", "pointer");
    UI.ComponentDrop();
    UI.wire();
    //UI.FillSavedAlts();
  },
  Notification(type, message, details) {
    var ctype = 'is-info'
    if (type == 'Success')
      ctype = 'is-success'
    else if (type == 'Warning')
      ctype = 'is-warning'
    else if (type == 'Error')
      ctype = 'is-danger'
    $("body #Notifications").append(`<div class="notification ` + ctype + ` is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>` + type + `</strong><br>` + message + `<br><strong>Details:</strong><br>` + details + `</div>`);
  },
  VariableResistorChange(_vresist) {
    $("input[name='vresistance']").slider();
    $("input[name='vresistance']").off();
    $("input[name='vresistance']").slider('value', $(_vresist).attr("data-spice-value"));
    const suffix = $(_vresist).data("spice-maxvalue").replace(/[0-9\.]/g, '');
    const maxVal = $(_vresist).data("spice-maxvalue").replace(/[^0-9\.]/g, '');
    $("#VariableResistor h5").html($(_vresist).attr("data-spice-value"));
    $("#VariableResistor").addClass("is-active");
    $("input[name='vresistance']").click(function () {
      const newVal = ($(this).val() * maxVal) / 100 + suffix;
      $(_vresist).data("spice-value", newVal);
      $(_vresist).data("spice-analog-value", newVal);
      $("#VariableResistor h5").html(newVal);
      $(_vresist).attr("data-spice-value", newVal);
    })
  },
  SaveVariableResistance() {
    $("input[name='vresistance']").off('click');
  },
  wire: function () {
    $("wire,port").css("cursor", "crosshair");
    $("body").off("click", "wire");
    //To start wiring, the student must click on a port or a wire
    $("body").on('click', 'wire', function (event) {
      console.log("clicked wire"); if ($(this).attr("data-spice-node") || $(this).attr("data-spice-node") == '0') {
        if (event.altKey) {
          if ($(this).attr("data-spice-revert-node") && $(this).attr("data-spice-revert-node") != $(this).attr("data-spice-node")) {
            $(this).attr("data-spice-node", $(this).attr("data-spice-revert-node")).attr("data-tooltip", $(this).attr("data-spice-node"))
          }
          const _wire = this;
          const WireSpan = [{
            horizontal: [$(_wire).offset().left, ($(_wire).offset().left + $(_wire).width())],
            vertical: [$(_wire).offset().top, ($(_wire).offset().top + $(_wire).height())]
          }];
          $("connector port").each(function () {
            const _port = this;
            const PortSpan = [{
              horizontal: [$(_port).offset().left, ($(_port).offset().left + $(_port).width())],
              vertical: [$(_port).offset().top, ($(_port).offset().top + $(_port).height())]
            }];
            if (Check.inSpan(WireSpan, PortSpan))
              $(_port).attr("data-spice-node", "999")
          })
          if ($(this).data("candelete") != false)
            $(this).css("display", "none").css("width", "0px").css("height", "0px").remove();
        } else {
          var spiceNode = " data-spice-node=\"" + $(this).attr("data-spice-node") + "\" data-tooltip=\"" + $(this).attr("data-spice-node") + "\"";
          if ($(this).attr("data-spice-collapse-node"))
            spiceNode += " data-spice-collapse-node=\"" + $(this).attr("data-spice-collapse-node") + "\"";
          if ($(this).attr("data-spice-revert-node"))
            spiceNode += " data-spice-revert-node=\"" + $(this).attr("data-spice-revert-node") + "\"";
          var wireid = $('wire').length;
          var bindid = $('bind').length;
          while ($("#wire" + wireid).length)
            wireid++;
          while ($("#bind" + bindid).length)
            bindid++;
          var endbind = bindid + 1;
          var left = Math.round(event.clientX / 1) * 1;
          var top = Math.round(event.clientY / 1) * 1;
          if (["PORT", "WIRE"].includes($(event.currentTarget).prop("nodeName")))
            if ($(event.currentTarget).width() == 6)
              left = $(event.currentTarget).offset().left;
            else if ($(event.currentTarget).height() == 6)
              top = $(event.currentTarget).offset().top;
            else if ($(event.currentTarget).height() > $(event.currentTarget).width())
              left = $(event.currentTarget).offset().left + $(event.currentTarget).width() / 2;
            else
              top = $(event.currentTarget).offset().top + $(event.currentTarget).height() / 2;
          $("#main").append("<wire id='wire" + wireid + "' style='display:inline-block;background:#333;position:absolute;'" + spiceNode + "></wire>");
          $("#wire" + wireid).show().offset({ top: top, left: left });
          $(document).mousemove(function (event) {
            var cardinalOffset = [(top - event.clientY), (left - event.clientX), (event.clientY - top), (event.clientX - left)];
            peakDirection = cardinalOffset.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
            var clientY = Math.round(event.clientY / 1) * 1;
            var clientX = Math.round(event.clientX / 1) * 1;
            switch (peakDirection) {
              case 0://cursor trending up
                $("#wire" + wireid + "").css("width", "6px").css("height", (top - clientY)).css("top", (clientY)).css("left", left);
                $("#bind" + endbind + "").css("top", clientY - 4).css("left", clientX - 4);
                break;
              case 1://cursor trending left
                $("#wire" + wireid + "").css("height", "6px").css("width", (left - clientX)).css("top", (top)).css("left", clientX);
                $("#bind" + endbind + "").css("top", clientY - 4).css("left", clientX - 4);
                break;
              case 2://cursor trending down
                $("#wire" + wireid + "").css("width", "6px").css("height", (clientY - top)).css("top", top).css("left", left);
                $("#wire" + wireid + "").css("width", "6px").css("height", (clientY - top)).css("top", top).css("left", left);
                $("#bind" + endbind + "").css("top", clientY - 4).css("left", clientX - 4);
                break;
              case 3://cursor trending right
                $("#wire" + wireid + "").css("height", "6px").css("width", (clientX - left)).css("top", top).css("left", left);
                $("#bind" + endbind + "").css("top", clientY - 4).css("left", clientX - 4);
                break;
              default:
                void (0);
            }
          })
        }
      }
    })
    $("body").dblclick(function (event) {
      $("wire,port").css("cursor", "crosshair");
      $("body").css("cursor", "default");
      var wireid = $('wire').length;
      while ($("#wire" + wireid).length)
        wireid++;
      wireid--;
      if (event.target.nodeName.toLocaleLowerCase() == "wire") {
        if ($("#" + event.target.id).attr("data-spice-node") == $("#wire" + wireid).attr("data-spice-node")) {
          console.log("You're allowed to join these nodes");
          //UI.Notification("Success","These nodes can be joined!","These wires were already on the same node.");
        } else if ($("#" + event.target.id).data("spice-collapse-node") || $("#wire" + wireid).data("spice-collapse-node")) {
          console.log("Collapsing the node");
          var supernode = $("#" + event.target.id).attr("data-spice-node")
          if (!$("#wire" + wireid).data("spice-collapse-node"))
            supernode = $("#wire" + wireid).attr("data-spice-node");
          $("wire[data-spice-node='" + $("#" + event.target.id).attr("data-spice-node") + "']").attr("data-spice-node", supernode);
          $("wire[data-spice-node='" + $("#wire" + wireid).attr("data-spice-node") + "']").attr("data-spice-node", supernode);
        } else {
          console.log("You can't join these wires");
          $("#wire" + wireid).css("display", "node").css("width", "0px").css("height", "0px").remove();
        }
      } else if (event.target.nodeName.toLocaleLowerCase() == "port") {
        $(event.target.id).attr("data-spice-node", $("#wire" + wireid).attr("data-spice-node"));
      }
      $(document).off("mousemove");
    })
  },
  ComponentDrop: function () {
    $("export component").mouseup(function (event) {
      const _comp = this;
      $(_comp).find("port").each(function () {
        console.log("removing preset")
        $(this).removeProp("preset");
      });
      $("wire").each(function () {
        if ($(this).is(":visible") && $(this).width() > 0 && $(this).height() > 0) {
          const _wire = this;
          $(_comp).find("port").each(function () {
            const _port = this;
            $(_port).attr("data-spice-node", "999");
            const Component = [{
              horizontal: [$(_comp).offset().left, ($(_comp).offset().left + $(_comp).width())],
              vertical: [$(_comp).offset().top, ($(_comp).offset().top + $(_comp).height())]
            }];
            var InterPortSpace = [];
            $(_comp).find(".InterPortSpace").each(function () {
              InterPortSpace.push({
                horizontal: [$(this).offset().left, ($(this).offset().left + $(this).width())],
                vertical: [$(this).offset().top, ($(this).offset().top + $(this).height())]
              })
            })
            var wired = false;
            var portWidth = $(_port).width();
            var portHeight = $(_port).height();
            if ($(_comp).hasClass("rotated-90") || $(_comp).hasClass("rotated-270")) {
              portWidth = $(_port).height();
              portHeight = $(_port).width();
              InterPortSpace = [];
              $(_comp).find(".InterPortSpace").each(function () {
                InterPortSpace.push({
                  horizontal: [$(this).offset().left, ($(this).offset().left + $(this).height())],
                  vertical: [$(this).offset().top, ($(this).offset().top + $(this).width())]
                });
              });
            }
            var hasIPS = false;
            if ($(_comp).find(".InterPortSpace").width() > 0 && $(_comp).find(".InterPortSpace").height() > 0)
              hasIPS = true;
            const Port = [{
              horizontal: [$(_port).offset().left, ($(_port).offset().left + portWidth)],
              vertical: [$(_port).offset().top, ($(_port).offset().top + portHeight)]
            }];
            if ($(_wire).width() == 0 || $(_wire).height() == 0) $(_wire).hide();
            var wirespan = [{
              horizontal: [$(_wire).offset().left, ($(_wire).offset().left + $(_wire).width())],
              vertical: [$(_wire).offset().top, ($(_wire).offset().top + $(_wire).height())]
            }];
            if (Check.inSpan(Port, wirespan) && !wired) {
              console.log("Dropping Component on a wire");
              wired = true;
              $(_port).attr("data-spice-node", $(_wire).attr("data-spice-node"));
              if ($(_wire).height() == 6 && portHeight == 6) {
                var heightDiff = $(_port).offset().top - $(_wire).offset().top;
                $(_comp).css("top", ($(_comp).offset().top - heightDiff));
                if (hasIPS && !$("meta[name='circuit']").data("framework"))
                  UI.SplitWire(("#" + $(_wire).attr("id")), InterPortSpace);
              } else if ($(_wire).width() == 6 && portWidth == 6) {
                var widthDiff = $(_port).offset().left - $(_comp).offset().left;
                $(_comp).css("left", ($(_wire).offset().left - widthDiff));
                if (hasIPS && !$("meta[name='circuit']").data("framework"))
                  UI.SplitWire(("#" + $(_wire).attr("id")), InterPortSpace);
              }
            }
          })
        }
      })
    })
  },
  setMultimeter: function (arg) {
    const multimeter = $("meta[name='circuit']").data("multimeter");
    console.log(multimeter);
    var expectedAmmeterCurrents = {};
    for (var a of multimeter)
      if (/v\([0-9]+(,[0-9+])?\) = .+/.test(a)) {
        var node = a.split(" = ")[0].replace(/[^0-9]/g, '')
        var voltage = parseFloat(a.split(" = ")[1]);
      }
      else if (/v\([0-9]+,[0-9+]?\)\/1m = .+/.test(a)) {
        var nodes = a.split(" = ")[0].replace(/[^0-9,]/g, '').split(",");
        var current = parseFloat(a.split(" = ")[1]) * 1000;
      }
    console.log("Multimeter Response:");
    console.log(arg);
    var nodeVoltages = {};
    var ammeterCurrents = {};
    for (var a of arg)
      if (/v\([0-9]+(,[0-9+])?\) = .+/.test(a)) {
        var node = parseInt(a.split(" = ")[0].replace(/[^0-9]/g, ''))
        var voltage = parseFloat(a.split(" = ")[1]);
        nodeVoltages[node] = voltage;
      }
      else if (/v\([0-9]+,[0-9+]?\)\/1m = .+/.test(a)) {
        const nodes = a.split(" = ")[0].replace('/1m', '').replace(/[^0-9,]/g, '').split(",");
        const current = Math.round(parseFloat(a.split(" = ")[1]) * 100000) / 100;
        $("component[data-spice-type='Ammeter']").each(function () {
          console.log(nodes);
          console.log(parseInt($(this).find("port[name='+']").attr("data-spice-node")));
          console.log(parseInt($(this).find("port[name='-']").attr("data-spice-node")));
          if (parseInt($(this).find("port[name='+']").attr("data-spice-node")) == parseInt(nodes[0]))
            if (parseInt($(this).find("port[name='-']").attr("data-spice-node")) == parseInt(nodes[1])) {
              console.log("Found the Ammeter we're interested in")
              $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
              $(this).attr("data-tooltip", ("Ammeter:" + $(this).attr("data-spice-name") + "\nSimulated:" + current + "mA\nMeasured:N/A"));
            }
        })
      }
    console.log(nodeVoltages)
    console.log(ammeterCurrents);
    $("wire").each(function () {
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      if (nodeVoltages.hasOwnProperty(parseInt($(this).attr("data-spice-node"))))
        $(this).attr("data-tooltip", ("Node:" + $(this).attr("data-spice-node") + "\nSimulated:" + nodeVoltages[$(this).attr("data-spice-node")] + "V\nMeasured:N/A"));
    });
  },
  makeSPICE: function (type, debugFunction, verboseFunction, callback) {
    UI.nodes = [];
    UI.components = [];
    const powersupply = [{
      voltage: parseFloat($("#Source td[name='voltage1']").html()),
      positive: $("port[name='powersupply-1-positive']").attr("data-spice-node"),
      negative: $("port[name='powersupply-1-negative']").attr("data-spice-node")

    }, {
      voltage: parseFloat($("#Source td[name='voltage2']").html()),
      positive: $("port[name='powersupply-2-positive']").attr("data-spice-node"),
      negative: $("port[name='powersupply-2-negative']").attr("data-spice-node")
    }];
    const signalgenerator = {
      freqMultiple: $("#SignalGenerator td[name='frequency']").html().split(" ").pop(),
      voltage: parseFloat($("#SignalGenerator td[name='voltage']").html()),
      frequency: parseFloat($("#SignalGenerator td[name='frequency']").html()),
      waveType: "sine",
      positive: $("port[name='signalgenerator-positive']").attr("data-spice-node"),
      negative: $("port[name='signalgenerator-negative']").attr("data-spice-node")
    };
    const oscilloscope = [{
      line: $("#Oscilloscope input[name='simulation-line']").val(),
      transformation: {
        type: $("#Oscilloscope form[name='scope1-transformation'] input[name='type']:checked").val(),
        factor: $("#Oscilloscope form[name='scope1-transformation'] input[name='factor']").val()
      },
      positive: $("port[name='oscilloscope-1-positive']").attr("data-spice-node"),
      negative: $("port[name='oscilloscope-1-negative']").attr("data-spice-node")
    }, {
      line: $("#Oscilloscope input[name='simulation-line']").val(),
      transformation: {
        type: $("#Oscilloscope form[name='scope2-transformation'] input[name='type']:checked").val(),
        factor: $("#Oscilloscope form[name='scope2-transformation'] input[name='factor']").val()
      },
      positive: $("port[name='oscilloscope-2-positive']").attr("data-spice-node"),
      negative: $("port[name='oscilloscope-2-negative']").attr("data-spice-node")
    }];
    const ground = $("ground port").attr("data-spice-node")
    var multimeternodes = [];
    $("wire").each(function () {
      if ($(this).attr("data-spice-node"))
        multimeternodes.push($(this).attr("data-spice-node"));
    })
    $("component[data-spice-type='Ammeter']").each(function () {
      multimeternodes.push({ '+': $(this).find("port[name='+']").attr("data-spice-node"), '-': $(this).find("port[name='-']").attr("data-spice-node"), 'value': $(this).data("spice-value") })
    })
    multimeternodes = [...new Set(multimeternodes)];
    if (signalgenerator.freqMultiple == "kHz")
      signalgenerator.frequency = signalgenerator.frequency * 1000;
    $("#SignalGenerator .type a").each(function () {
      if ($(this).hasClass("is-info"))
        signalgenerator.waveType = $(this).attr("name");
    })
    if ($("meta[name='circuit']").data("framework")) {
      $("wire").each(function () {
        var nodeExists = false;
        var node = $(this).attr("data-spice-node");
        if (!UI.nodes.hasOwnProperty(node))
          UI.nodes[node] = { name: node, span: [] }
      });
      $("export component").each(function () {
        var component = {
          name: $(this).data("spice-name"),
          type: $(this).data("spice-type"),
          value: $(this).data("spice-value"),
          ports: []
        };
        $(this).find("port").each(function () {
          component.ports.push({
            name: $(this).attr("name"),
            nodes: [$(this).attr("data-spice-node")]
          });
        });
        UI.components.push(component);
      });
      var nodes = [];
      for (var n in UI.nodes)
        nodes.push(UI.nodes[n]);
      this.SPICE = new SPICE("Framework", {
        powersupply: powersupply,
        signalgenerator: signalgenerator,
        oscilloscope: oscilloscope,
        nodes: nodes,
        components: UI.components,
        multimeternodes: multimeternodes,
        subcircuits: $("meta[name='circuit']").data("subcircuit"),
        models: $("meta[name='circuit']").data("models")
      },
        debugFunction,
        verboseFunction,
        callback);
    }
  },
  Simulate: function () {
    $("wire").each(function () {
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      $(this).attr("data-tooltip", "Node:" + $(this).attr("data-spice-node"));
    });
    $("port").each(function () {
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      $(this).attr("data-tooltip", "Node:" + $(this).attr("data-spice-node"));
    });
    UI.makeSPICE("simulation", function (error) {
      $("body #Notifications").append(`<div class="notification is-danger  is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Error</strong><br>There was an error simulating the circuit. Please check your circuit<br><strong>Details:</strong><br>` + error + `</div>`);
    }, console.log, function (netlist, normalised) {
      $.post("http://127.0.0.1:3001/simulate", {
        circuit: netlist
      }).done(function (data) {
        console.log(data);
        UI.setMultimeter(data.multimeter);
        $("#Simulation p.sim-result").html(data.simulate);
        $("#Simulation").addClass("is-active");
      }).fail(function (error) {
        console.log(error)
      })
      console.log(netlist)
      $("body #Notifications").append(`<div class="notification is-info  is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>SPICE Circuit</strong><br>The circuit is below<strong>Details:</strong><br>` + netlist.replace(/\n/g, '<br>') + `</div>`);
    });
  }
}