/*
Check Object
------------
*/
var Check = {
  Validate: function () {
    $("wire").each(function () {
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      $(this).attr("data-tooltip", "Node:" + $(this).attr("data-spice-node"));
    });
    $("port").each(function () {
      $(this).addClass("has-tooltip-arrow").addClass("has-tooltipl-multiline");
      $(this).attr("data-tooltip", "Name:" + $(this).attr("name") + "\nNode:" + $(this).attr("data-spice-node"));
    });
    console.log("Continuity Check passed!");
    Check.SetComponents();
    var checkResult = Check.CheckComponents();
    console.log(checkResult);
    if (checkResult.matchedALT) {
      console.log("Circuit Matched!");
      console.log(checkResult.matchedALT);
      $("meta[name='match']").data("alt", checkResult.matchedALT);
      $("button[data-action='implement']").data("digital", $("meta[name='circuit']").data("alt")[checkResult.matchedALT].Output.Post.Digital);
    }
  },
  checkConnected: function (_wire, _port) {
    console
    const WireSpan = [{
      horizontal: [$(_wire).offset().left, ($(_wire).offset().left + $(_wire).width())],
      vertical: [$(_wire).offset().top, ($(_wire).offset().top + $(_wire).height())]
    }];
    var portWidth = $(_port).width();
    var portHeight = $(_port).height();
    if ($(this).parent("component").hasClass("rotated-270") || $(this).parent("component").hasClass("rotated-90")) {
      portWidth = $(_port).height();
      portHeight = $(_port).width();
    }
    const PortSpan = [{
      horizontal: [$(_port).offset().left, ($(_port).offset().left + portWidth)],
      vertical: [$(_port).offset().top, ($(_port).offset().top + portHeight)]
    }];
    console.log(inSpan(WireSpan, PortSpan));
  },
  SetComponents: function () {
    $("connectors port").each(function () {
      const _port = this;
      const PortSpan = [{
        horizontal: [$(_port).offset().left, ($(_port).offset().left + $(_port).width())],
        vertical: [$(_port).offset().top, ($(_port).offset().top + $(_port).height())]
      }];
      $(_port).attr("data-spice-node", "999")
      $("wire").each(function () {
        const _wire = this;
        const WireSpan = [{
          horizontal: [$(_wire).offset().left, ($(_wire).offset().left + $(_wire).width())],
          vertical: [$(_wire).offset().top, ($(_wire).offset().top + $(_wire).height())]
        }];
        if (inSpan(WireSpan, PortSpan))
          $(_port).attr("data-spice-node", "999")
      })
    })
    $("port").each(function () {
      var _port = this;
      var portWidth = $(_port).width();
      var portHeight = $(_port).height();
      $(_port).attr("data-spice-node", 999);
      if ($(this).parent("component").hasClass("rotated-270") || $(this).parent("component").hasClass("rotated-90")) {
        portWidth = $(_port).height();
        portHeight = $(_port).width();
      }
      const PortSpan = [{
        horizontal: [$(_port).offset().left, ($(_port).offset().left + portWidth)],
        vertical: [$(_port).offset().top, ($(_port).offset().top + portHeight)]
      }];
      match = false;
      $("wire").each(function () {
        var _wire = this;
        if ($(_wire).width() == 0 || $(_wire).height() == 0) $(_wire).hide();
        const WireSpan = [{
          horizontal: [$(_wire).offset().left, ($(_wire).offset().left + $(_wire).width())],
          vertical: [$(_wire).offset().top, ($(_wire).offset().top + $(_wire).height())]
        }];
        if (inSpan(PortSpan, WireSpan) && $(_port).width() > 0 && $(_port).height() > 0) {
          //console.log("found a match for"+$(_port).parent("component").attr("data-spice-name")+" port:"+$(_port).attr("id"));
          match = true;
          //console.log($(_wire).attr("data-spice-node"));
          $(_port).attr("data-spice-node", $(_wire).attr("data-spice-node"));
        }
      });
      if (!match) {
        //console.log($(_port).parent("component").attr("data-spice-name")+" isn't on a node");
        //$(_port).attr("data-spice-node",'-1');
      }
    })
    return true;
  },
  CheckComponents: function () {
    var results = {
      matching: [],
      notmatching: [],
      altresults: new Array($("meta[name='circuit']").data("alt").length),
      matchedALT: null
    }
    for (var a = 0; a < results.altresults.length; a++)
      results.altresults[a] = [];
    $("component").each(function () {
      const _comp = this;
      const COMPONENT = $(this).attr('data-spice-name');
      const DIRECTIONAL = $(this).attr("data-spice-directional");
      if (DIRECTIONAL == 'true') {
        $(this).find("port").each(function () {
          const PORT = $(this).attr("name");
          const CURRENT_NODE = $(this).attr("data-spice-node");
          const TARGET_NODES = JSON.parse($(this).attr("data-spice-target-nodes"));
          for (var a = 0; a < results.altresults.length; a++)
            if (TARGET_NODES[a] != CURRENT_NODE)
              results.altresults[a].push(COMPONENT + " " + PORT + " Should Be Connectioned to: " + TARGET_NODES[a] + " but it is actually on node: " + CURRENT_NODE);
        })
      } else {
        var reqports = new Array($("meta[name='circuit']").data("alt").length);
        for (var a = 0; a < reqports.length; a++)
          reqports[a] = [];
        var conports = [];
        $(this).find("port").each(function () {
          const CURRENT_NODE = $(this).attr("data-spice-node");
          const TARGET_NODES = JSON.parse($(this).attr("data-spice-target-nodes"));
          conports.push(CURRENT_NODE);
          for (var a = 0; a < results.altresults.length; a++)
            reqports[a].push(TARGET_NODES[a]);
        });
        for (var a = 0; a < reqports.length; a++)
          if (reqports[a].sort().join(" ") != conports.sort().join(" "))
            results.altresults[a].push(COMPONENT + " Should Have Node Connections: " + reqports[a].sort().join(" ") + " but it is actually on node: " + conports.sort().join(" "))
      }
    })
    $("connectors port").each(function () {
      if ($(this).attr("data-spice-target-nodes")) {
        const TARGET_NODES = JSON.parse($(this).attr("data-spice-target-nodes"));
        const CURRENT_NODE = parseInt($(this).attr("data-spice-node"));
        if ($(this).attr("data-spice-target-nodes"))
          for (var a = 0; a < results.altresults.length; a++)
            if (CURRENT_NODE != parseInt(TARGET_NODES[a]))
              results.altresults[a].push("A " + $(this).data("spice-bench") + " port should be connected to node:" + TARGET_NODES[a] + " but it is actually on node:" + CURRENT_NODE)
      }
    })
    if ($("meta[name='circuit']").data("page").prev || $("meta[name='circuit']").data("page").next) {
      if (results.notmatching.length) {
        $("body #Notifications").append(`<div class="notification is-warning  is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Error</strong><br>Some of your connections are incorrect<br><strong>Details:</strong><br>` + results.notmatching.join('<br>') + `</div>`);
        $("nav button[data-action='implement']").prop("disabled", true).css("background-color", "#363636").css("color", "#aaa").css("cursor", "disabled");;
      } else
        $("nav button[data-action='implement']").prop("disabled", false).css("color", "#fff").css("cursor", "pointer");
      if (results.matching.length)
        $("body #Notifications").append(`<div class="notification is-success  is-light"><button class="delete" onclick='$(this).parent().remove()'></button><strong>Success</strong><br>Some of your connections are correct<br><strong>Details:</strong><br>` + results.matching.join('<br>') + `</div>`);
    } else { //creative mode
      var min = { index: 0, value: 0 };
      if (results.altresults[0])
        min.value = results.altresults[0].length;
      var pcount = 0;
      console.log(results);
      for (var a in results.altresults) {
        if (results.altresults[a].length == 0)
          pcount++;
        if (results.altresults[a].length < min.value) {
          min.index = a;
          min.value = results.altresults[a].length;
        }
      }
      if (pcount == 1) {
        UI.Notification("Success", ("Your circuit matched a valid hardware implementation:"), $("meta[name='circuit']").data("alt")[min.index].Name)
        results.matchedALT = min.index;
        $("nav button[data-action='implement']").attr("data-alt", min.index).data("analog", UI.Analog).prop("disabled", false).css("color", "#fff").css("cursor", "pointer");
      } else if (pcount == 0) {
        $("nav button[data-action='implement']").attr("data-alt", min.index).prop("disabled", true).css("color", "#aaa").css("cursor", "disabled");
        console.log("no matches")
        UI.Notification("Warning", "Your circuit failed to match a hardware implementation.", "There are at least " + min.value + " ports misconfigured. The closest configuration is: <br><b>" + $("meta[name='circuit']").data("alt")[min.index].Name + "</b><br> Inspect your connections, node voltages and simulation output. The closest configuration is mismatched in the following way:<br>" + results.altresults[min.index].join("<br>"))
      } else {
        UI.Notification("Error", "Your circuit matches multiple possible implementations. Please report this to your lab demonstrator", "")
      }
    }
    return results;
  }
}