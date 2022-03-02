/*
SPICE Class
-----------
The SPICE class translates a given circuit into the SPICE representation for the purposes of simuation and actuation.
The class contains a number of functions, which are called one-after-another. 

The initial state (input):

HTML object (board) containing "wires" and "components". "components" contain "ports". "Ports" are positioned
over the connection points of each component image, so that students can connect a wire to the intuitive place on
each component.

The output is a SPICE representation, which is a list of components on each line. The line contains parameters, including
 - component type
 - the node that each component connection is connected to
 - component value (resistance, capacitance, etc)
 - component class (type of OPAMP, etc)
 - other circuit parameters

The procedure, in the broadest terms, is:

  1. Identify all wires, and add the wires to an array that contains the wire position, height and width (pixels on the screen)
  2. Determine the "span" of each wire. The "span" is defined as the coordinates (top,left = 0,0) contained within the wire
  3. Iterate through each wire, and determine which wires are touching. Iterate this process to produce "nodes".
  4. Establish the power supply configuration, and correctly label the ground node:
    a. power supply 1 goes to node 1
    b. power supply 2 goes to node 2
    c. signal generator goes to node 3

*/
class SPICE{
  constructor(powersupply,signalgenerator,oscilloscope,ground,nodes,components,wires,binds,parts,scopenodes,subcircuit,simulationParams,debugFunction,complete){
    this.powersupply = powersupply;
    this.signalgenerator = signalgenerator;
    this.oscilloscope = oscilloscope;
    this.ground = ground;
    this.scopenodes = scopenodes;
    this.ammeters = [];
    console.log(this.powersupply);
    console.log(this.signalgenerator);
    console.log(this.oscilloscope);
    console.log(this.scopenodes);
    console.log(this.ground);
    console.log(components);
    this.connectionnodes = {
      ps1_positiveNode:null,
      ps1_negativeNode:null,
      ps2_positiveNode:null,
      ps2_negativeNode:null,
      siggen_positivenode:null,
      siggen_negativenode:null
    }
    this.SPICE = "";
    this.dbg = debugFunction;

    if(!nodes || !components){
      this.dbg("No WireFrame - must manually identify nodes!");
      this.wires = wires;
      this.parts = parts;
      this.binds = binds;
      this.components = [];
      this.nodes = [];
      this.segments = [];
      this.getSegmentsAndComponents();
      this.connectedSegments();
      this.formNodes();
      this.labelNodes();
    }else{
      this.dbg("WireFrame provided (no need to manually identify nodes)");
      this.nodes = nodes;
      this.components = components;
      var scopeValid = false;
      if(oscilloscope.hasOwnProperty('params'))
        if(oscilloscope.params.hasOwnProperty('type'))
          if(['transient','sweep'].includes(oscilloscope.params.type))
            if(oscilloscope.params.type == 'transient'){
              if(/[0-9]+(f|p|n|u|m)?/g.test(oscilloscope.params.transient.runtime) && /[0-9]+(f|p|n|u|m)?/g.test(oscilloscope.params.transient.step))
                scopeValid = true;
            }else if(oscilloscope.params.type == 'sweep'){

            }
      if(!scopeValid){
        this.dbg("<b>Error:</b> The Oscilloscope is not configured correctly. Please check your settings")
        throw 'Oscilloscope Setup Error'
      }
      for(var n of this.nodes)
        if(n.name == '0')
          if(!this.inSpan(this.ground.span,n.span)){
            console.log(this.ground.span)
            console.log(n.span);
            this.dbg("<b>Error:</b> Ground is not placed correctly.")
            throw 'Ground Placement Error'
          }
        if(scopenodes)
          if(n.name == scopenodes.positive)
            if(!this.inSpan(this.oscilloscope.positive.span,n.span)){
              this.dbg("<b>Error:</b> Oscilloscope Probe(+) not placed correctly.");
              throw 'Scope Placement Error';
            }
          if(n.name == scopenodes.negative)
            if(!this.inSpan(this.oscilloscope.negative.span,n.span)){
              this.dbg("<b>Error:</b> Oscilloscope Probe(-) not placed correctly.");
              throw 'Scope Placement Error';
            }
    }
    this.setComponentNodes();
    this.SPICE += "Test Circuit\n";
    if(subcircuit)
      this.SPICE += subcircuit+'\n';
    this.spiceConvert_connectionNodes();
    this.spiceConvert_source();
    this.spiceConvert_components();
    this.spiceConvert_ammeters();
    this.spiceConvert_simulation();
    this.SPICENORM = this.spiceConvert_comparison();
    this.dbg("Complete!");
    complete(this.SPICE),this.SPICENORM;
}

//Take the cartesian coordinates of a rectangle, returns true if the rectangles overlap
rectanglesIntersect(minAx,minAy,maxAx,maxAy,minBx,minBy,maxBx,maxBy ) {
    var aLeftOfB = maxAx < minBx;
    var aRightOfB = minAx > maxBx;
    var aAboveB = minAy > maxBy;
    var aBelowB = maxAy < minBy;
    return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );
}

//Returns false 
rectanglesNotContain(minAx,minAy,maxAx,maxAy,minBx,minBy,maxBx,maxBy ) {
    var aLeftOfB = minBx < minAx;
    var aRightOfB = maxBx > maxAx;
    var aAboveB = minBy < minAy;
    var aBelowB = maxBy > maxAy;
    return ( aLeftOfB || aRightOfB || aAboveB || aBelowB );
}


/*
inSpan (bool) returns true if the object given touches the span of the wire segment or node given as spans
- Object is either a (wire) segment or a component, and contains a single span not in an array
- Spans is an array that contains the set of regions (rectangles) that a node or segment spans in pixels
If the input is a node, the spans object will contains >= 1 span, if the segment is a 
[{
    vertical:[100,200],
    height:[50,20]
}]
*/

 inSpan(spans1,spans2){
   if(spans1) for(var s1 of spans1)
    if(spans2) for(var s2 of spans2)
        //Horizontally aligned
        if(this.rectanglesIntersect(
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

//is span2 contained entirely within span1
containedSpan(spans1,spans2){
  var totalContain = true;
  if(spans1) for(var s1 of spans2){
    var spanContained = false;
    for(var s2 of spans2)
      if(!this.rectanglesNotContain(
          s1.horizontal[0],
          s1.vertical[0],
          s1.horizontal[1],
          s1.vertical[1],
          s2.horizontal[0],
          s2.vertical[0],
          s2.horizontal[1],
          s2.vertical[1])
      ) 
        spanContained = true;
    if(!spanContained) totalContain = false;
  }
  return totalContain;
  }

 getSegmentsAndComponents(){
    this.dbg("Calculating the span of each wire segment")
    for(var i=0;i<this.wires.length;i++){
        if(this.wires[i].width>0 && this.wires[i].height>0)
          this.wires[i].span.push({
            horizontal:[this.wires[i].position.left,(this.wires[i].position.left+this.wires[i].width)],
            vertical:[this.wires[i].position.top,(this.wires[i].position.top+this.wires[i].height)]
          });
    }
    for(var w of this.wires){
      var connected = false;
      for(var wq of this.wires) 
        if(w.id != wq.id) 
          if(this.inSpan(w.span,wq.span)) connected = true;
      if(connected) this.segments.push(JSON.parse(JSON.stringify(w)));
    }
    this.dbg("Removing unnecessary wire segments to speed up analysis")
    for(var i=0;i<this.segments.length;i++){
      for(var j=0;j<this.segments.length;j++){
        if(this.segments[j].span[0].horizontal[0] > this.segments[i].span[0].horizontal[0])
          if(this.segments[j].span[0].horizontal[1] < this.segments[i].span[0].horizontal[1])
            if(this.segments[j].span[0].vertical[0] > this.segments[i].span[0].vertical[0])
              if(this.segments[j].span[0].vertical[1] < this.segments[i].span[0].vertical[1])
                this.segments = this.segments.splice(j,1);
      }
    }
    this.dbg("Calculating the span of components and each port within a component")
    for(var p of this.parts){
        var component = {id:p.id,span:[],nodes:[],ports:[],type:p.type};
        var span = [{
            horizontal:[p.position.left,(p.position.left+p.width)],
            vertical:[p.position.top,(p.position.top+p.height)]
        }];
        component.span = span;
        for(var po of p.ports){
          var port = {id:po.id,span:[],nodes:[]};
          var span = [{
            horizontal:[po.position.left,(po.position.left+po.width)],
            vertical:[po.position.top,(po.position.top+po.height)]
          }];
          port.span = span;
          component.ports.push(port);
        }
        this.components.push(component)
    }
}
 connectedSegments(){
   this.dbg("Determining which wire segments and ports are connected together");
   this.dbg("&emsp;Finding adjacent wire segments and ports");
    for(var i=0;i<this.segments.length;i++){
        const fixed = this.segments[i];
        for(var j=0;j<this.segments.length;j++) if(i != j){
            const inQuestion = this.segments[j];
            if(this.segments[i].type == "wire" && this.segments[j].type == "wire"){
              for(var b of this.binds)
                if(this.inSpan(b.span,fixed.span) && this.inSpan(b.span,inQuestion.span))
                  if(!this.segments[i].connected.includes(j)){
                    this.dbg("&emsp;&emsp;"+this.segments[i].id+" is connected to "+this.segments[j].id+" with a bind");
                    this.segments[i].connected.push(j);
                  }
            }else{
              if(this.inSpan(inQuestion.span,fixed.span))
                if(!this.segments[i].connected.includes(j)){
                  this.dbg("&emsp;&emsp;"+this.segments[i].id+" is connected to "+this.segments[j].id);
                  this.segments[i].connected.push(j);
                }
            }
        }
  }
  this.dbg("Recursively connecting segments together");
  for(var i=0;i<this.segments.length;i++)
    for(var j of this.segments[i].connected)
      for(var k of this.segments[j].connected)
        if(k != i && !this.segments[i].connected.includes(k))
          this.segments[i].connected.push(k)
  }

 formNodes(){
  this.dbg("Forming nodes on the basis of connected segments");
   var excluded = [];
  for(var i=0;i<this.segments.length;i++){
    var node = {name:this.nodes.length,span:[]}
    node.span.push(this.segments[i].span[0]);
    for(var j of this.segments[i].connected){
      node.span.push(this.segments[j].span[0]);
      excluded.push(j)
    }
    if(!excluded.includes(i)) 
      this.nodes.push(node);
  }
}

joinNodes(){
  for(var n=0;n<this.nodes.length;n++)
    for(var s1=0;s1<this.nodes[n].span.length;s1++)
      for(var s2=0;s2<this.nodes[n].span.length;s2++)
        if(s1!=s2)
          if(this.nodes[n].span[s1].horizontal[0] >= this.nodes[n].span[s2].horizontal[0])
            if(this.nodes[n].span[s1].horizontal[1] <= this.nodes[n].span[s2].horizontal[1])
              if(this.nodes[n].span[s1].vertical[0] >= this.nodes[n].span[s2].vertical[0])
                if(this.nodes[n].span[s1].vertical[1] <= this.nodes[n].span[s2].vertical[1])
                  this.nodes[n].span.splice(s1,1);
}

 setComponentNodes(){
  this.dbg("Setting the nodes that each component is connected to");
    for(var c=0;c<this.components.length;c++)
      for(var p=0;p<this.components[c].ports.length;p++)
        for(var n=0;n<this.nodes.length;n++)
            if(this.inSpan(this.components[c].ports[p].span,this.nodes[n].span))
              this.components[c].ports[p].nodes.push(this.nodes[n].name);
}

//Power supply 1 and 2 can be tethered if ground is placed at either the power supply positive or negative node of PS 2
labelNodes(){
  this.dbg("Labelling each node according to the SPICE/ELI conventions (i.e. 0 for the ground-connected node");
  for(var c=0;c<this.nodes.length;c++){
    //Set the ground node with name 0
    if(this.inSpan(this.nodes[c].span,this.ground.span)) 
      this.nodes[c].name = "0";
    //Set the power supply positive port as node 1
    if(this.inSpan(this.nodes[c].span,this.powersupply[0].positive.span)) 
      this.nodes[c].name = "a";
    //Set the power supply negative port as node 2 (if it isn't already ground)
    if(this.inSpan(this.nodes[c].span,this.powersupply[0].negative.span) && this.nodes[c].name != "0") 
      this.nodes[c].name = "b";
    //Set the power supply 2 positive port as node 3 (if it isn't already ground or tether to PS1)
    if(this.inSpan(this.nodes[c].span,this.powersupply[1].positive.span) && this.nodes[c].name != "0" && this.nodes[c].name != "2") 
      this.nodes[c].name = "c";
    //Set the power supply 2 negative port as node 4 (if it isn't already ground)
    if(this.inSpan(this.nodes[c].span,this.powersupply[1].negative.span) && this.nodes[c].name != "0" && this.nodes[c].name != "2") 
      this.nodes[c].name = "d";
    //Set the signal generator positive port as node 5 (it shouldn't be attached to a supply or ground)
    if(this.inSpan(this.nodes[c].span,this.signalgenerator.positive.span)) 
      this.nodes[c].name = "e";
    //Set the signal generator negative port as node 6 (if it isn't already attached to ground, power supply 1 ground, power supply 2 ground)
    if(this.inSpan(this.nodes[c].span,this.signalgenerator.negative.span) && this.nodes[c].name != "0" && this.nodes[c].name != "2" && this.nodes.name != "4") 
      this.nodes[c].name = "f";
  }
}

  spiceConvert_components(){
    this.dbg("Creating a SPICE line entry for each component");
    for(var c of this.components){
      var spiceLine = c.name+" ";
      for(var p in c.ports)
        if(c.ports[p].nodes.length == 1)
          spiceLine += c.ports[p].nodes[0]+" ";
        else
          spiceLine += "0 ";
      spiceLine += c.value;
      this.SPICE += spiceLine+"\n";
    }
  }

  spiceConvert_ammeters(){
    this.dbg("Finding and Recording Ammeter Positions");
    for(var c of this.components){
      if(c.name.includes('RAmmeter'))
        if(c.ports[0].nodes.length && c.ports[1].nodes.length && c.value)
          this.ammeters.push({positive:c.ports[0].nodes[0],negative:c.ports[1].nodes[0],value:c.value});
    }
    console.log(this.ammeters);
  }

  spiceConvert_connectionNodes(){
    this.dbg("Determining the nodes of connnections");
    for(var n of this.nodes){
      if(UI.inSpan(n.span,this.powersupply[0].positive.span))
        this.connectionnodes.ps1_positiveNode = n.name
      if(UI.inSpan(n.span,this.powersupply[0].negative.span)) 
        this.connectionnodes.ps1_negativeNode = n.name;
      if(UI.inSpan(n.span,this.powersupply[1].positive.span)) 
        this.connectionnodes.ps2_positiveNode = n.name
      if(UI.inSpan(n.span,this.powersupply[1].negative.span)) 
        this.connectionnodes.ps2_negativeNode = n.name;
      if(UI.inSpan(n.span,this.signalgenerator.positive.span)) 
        this.connectionnodes.siggen_positivenode = n.name
      if(UI.inSpan(n.span,this.signalgenerator.negative.span)) 
        this.connectionnodes.siggen_negativenode = n.name;
    }
    console.log(this.connectionnodes);
  }

  spiceConvert_source(){
    this.dbg("Creating a SPICE line entry for each power supply and the signal generator");
    if(this.connectionnodes.ps1_positiveNode != null && this.connectionnodes.ps1_negativeNode != null)
      this.SPICE += "V1 "+this.connectionnodes.ps1_positiveNode+" "+this.connectionnodes.ps1_negativeNode+" "+this.powersupply[0].voltage+"\n";
    if(this.connectionnodes.ps2_positiveNode != null && this.connectionnodes.ps2_negativeNode != null)
      this.SPICE += "V2 "+this.connectionnodes.ps2_positiveNode+" "+this.connectionnodes.ps2_negativeNode+" "+this.powersupply[1].voltage+"\n";
    if(this.connectionnodes.siggen_positivenode != null && this.connectionnodes.siggen_negativenode != null){
      var pulseParams = {
        V1: -this.signalgenerator.voltage,
        V2: this.signalgenerator.voltage,
        Td: 0,
        Tr: 0,
        Tf: 0,
        Pw: 0,
        Per:0,
        Phase:0
      }
      if(this.signalgenerator.waveType == "square"){
        pulseParams.Pw = 1/(this.signalgenerator.frequency*2)
        pulseParams.Per = 1/(this.signalgenerator.frequency)
      }
      if(this.signalgenerator.waveType == "triangle"){
        pulseParams.Tr = 1/(this.signalgenerator.frequency*2);
        pulseParams.Tf = 1/(this.signalgenerator.frequency*2);
        pulseParams.Pw = 1/(this.signalgenerator.frequency*2*100);
        pulseParams.Per = 1/(this.signalgenerator.frequency);
      }
      if(this.signalgenerator.waveType == "sawtooth"){
        pulseParams.Tr = 1/(this.signalgenerator.frequency);
        pulseParams.Pw = 0;
        pulseParams.Per = 1/(this.signalgenerator.frequency);
      }
      console.log(pulseParams)
      if(this.signalgenerator.waveType == "sine")
        this.SPICE += "V3 "+this.connectionnodes.siggen_positivenode+" "+this.connectionnodes.siggen_negativenode+" SINE(0,"+this.signalgenerator.voltage+","+this.signalgenerator.frequency+")\n";
      else 
        this.SPICE += "V3 "+this.connectionnodes.siggen_positivenode+" "+this.connectionnodes.siggen_negativenode+" PULSE("+pulseParams.V1+","+pulseParams.V2+","+pulseParams.Td+","+pulseParams.Tr+","+pulseParams.Tf+","+pulseParams.Pw+","+pulseParams.Per+","+pulseParams.Phase+")\n";
    }
  }

  spiceConvert_simulation(){
    this.SPICE += '.control\n'
    if(this.oscilloscope.params.type == 'transient'){
      this.SPICE += 'tran '+this.oscilloscope.params.transient.step+' '+this.oscilloscope.params.transient.runtime;
      this.SPICE += '\nrun\n'
      var printline = 'print'
      console.log(this.scopenodes)
      console.log(this.connectionnodes)
      console.log(this.ammeters)
      if(this.scopenodes.positive && (this.connectionnodes.siggen_positivenode || this.connectionnodes.ps1_positiveNode)){
        this.dbg("Setting up a transient simulation for Voltage");
        if(this.connectionnodes.siggen_positivenode)
          printline += ' v('+this.scopenodes.positive+') v('+this.connectionnodes.siggen_positivenode+')'
        else if(this.connectionnodes.ps1_positiveNode)
          printline += ' v('+this.scopenodes.positive+') v('+this.connectionnodes.ps1_positiveNode+')'
      }else if(this.ammeters.length){
        this.dbg("Setting up a transient simulation for Current");
        for(var a of this.ammeters) if(a.hasOwnProperty('value') && a.hasOwnProperty('positive') && a.hasOwnProperty('negative'))
          if(a.positive != '0' && a.negative != '0')
            printline += ' v('+a.positive+','+a.negative+')/'+a.value;
          else if(a.positive != '0' && a.negative == '0')
            printline += ' v('+a.positive+')/'+a.value;
          else if(a.positive == '0' && a.negative != '0')
            printline += '-v('+a.negative+')/'+a.value;
      }
      this.SPICE += printline+'\n';
    }
    this.SPICE += '.endc'
  }

  spiceConvert_comparison(){
    var SPICENORM = this.SPICE;
    this.SPICE.replace(/tran .+\n/g,'tran 5u 2m\n');
  }
}