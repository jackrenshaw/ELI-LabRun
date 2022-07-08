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
  constructor(type,parameters,debugFunction,verboseFunction,complete){
  if(type == "Framework"){
      verboseFunction("WireFrame provided (no need to manually identify nodes)");
    this.nodes = parameters.nodes;
    this.components = parameters.components; 
    this.powersupply = parameters.powersupply;
    this.signalgenerator = parameters.signalgenerator;
    this.oscilloscope = parameters.oscilloscope;
    this.multimeternodes = parameters.multimeternodes;
    this.components = parameters.components;
    this.nodes = parameters.nodes
    this.ammeters = [];
    this.dbg = debugFunction;
    this.vbs = verboseFunction;
    console.log(this);
    this.SPICE = "Test Circuit\n";
    if(parameters.subcircuits)
      this.SPICE += parameters.subcircuits+'\n';
    if(parameters.models)
      this.SPICE += parameters.models.join('\n')+'\n';
    this.spiceConvert_source();
    this.spiceConvert_components();
    this.spiceConvert_ammeters();
    this.spiceConvert_simulation();
    this.vbs("Complete!");
    complete(this.SPICE);
  }else
    this.vbs("No WireFrame - this mode is not supported at this stage");
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
    this.vbs("Calculating the span of each wire segment")
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
    this.vbs("Removing unnecessary wire segments to speed up analysis")
    for(var i=0;i<this.segments.length;i++){
      for(var j=0;j<this.segments.length;j++){
        if(this.segments[j].span[0].horizontal[0] > this.segments[i].span[0].horizontal[0])
          if(this.segments[j].span[0].horizontal[1] < this.segments[i].span[0].horizontal[1])
            if(this.segments[j].span[0].vertical[0] > this.segments[i].span[0].vertical[0])
              if(this.segments[j].span[0].vertical[1] < this.segments[i].span[0].vertical[1])
                this.segments = this.segments.splice(j,1);
      }
    }
    this.vbs("Calculating the span of components and each port within a component")
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
   this.vbs("Determining which wire segments and ports are connected together");
   this.vbs("&emsp;Finding adjacent wire segments and ports");
    for(var i=0;i<this.segments.length;i++){
        const fixed = this.segments[i];
        for(var j=0;j<this.segments.length;j++) if(i != j){
            const inQuestion = this.segments[j];
            if(this.segments[i].type == "wire" && this.segments[j].type == "wire"){
              for(var b of this.binds)
                if(this.inSpan(b.span,fixed.span) && this.inSpan(b.span,inQuestion.span))
                  if(!this.segments[i].connected.includes(j)){
                    this.vbs("&emsp;&emsp;"+this.segments[i].id+" is connected to "+this.segments[j].id+" with a bind");
                    this.segments[i].connected.push(j);
                  }
            }else{
              if(this.inSpan(inQuestion.span,fixed.span))
                if(!this.segments[i].connected.includes(j)){
                  this.vbs("&emsp;&emsp;"+this.segments[i].id+" is connected to "+this.segments[j].id);
                  this.segments[i].connected.push(j);
                }
            }
        }
  }
  this.vbs("Recursively connecting segments together");
  for(var i=0;i<this.segments.length;i++)
    for(var j of this.segments[i].connected)
      for(var k of this.segments[j].connected)
        if(k != i && !this.segments[i].connected.includes(k))
          this.segments[i].connected.push(k)
  }

 formNodes(){
  this.vbs("Forming nodes on the basis of connected segments");
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
  this.vbs("Setting the nodes that each component is connected to");
    for(var c=0;c<this.components.length;c++)
      for(var p=0;p<this.components[c].ports.length;p++)
        for(var n=0;n<this.nodes.length;n++)
            if(this.inSpan(this.components[c].ports[p].span,this.nodes[n].span))
              this.components[c].ports[p].nodes.push(this.nodes[n].name);
}

//Power supply 1 and 2 can be tethered if ground is placed at either the power supply positive or negative node of PS 2
labelNodes(){
  this.vbs("Labelling each node according to the SPICE/ELI conventions (i.e. 0 for the ground-connected node");
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
    this.vbs("Creating a SPICE line entry for each component");
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
    this.vbs("Finding and Recording Ammeter Positions");
    for(var c of this.components){
      if(c.name.includes('RAmmeter'))
        if(c.ports[0].nodes.length && c.ports[1].nodes.length && c.value)
          this.ammeters.push({positive:c.ports[0].nodes[0],negative:c.ports[1].nodes[0],value:c.value});
    }
  }

  spiceConvert_connectionNodes(){
    this.vbs("Determining the nodes of connnections");
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
  }

  spiceConvert_source(){
    if(!this.powersupply[0].positive && !this.powersupply[0].positive && !this.powersupply[0].negative && !this.signalgenerator.positive){
      this.dbg("<b>Error:</b> There are no sources connected to your circuit. No simulation can be produced");
      throw 'Source node error';
    }
    this.vbs("Creating a SPICE line entry for each power supply and the signal generator");
    if(this.powersupply[0].positive != this.powersupply[0].negative)
      this.SPICE += "V1 "+this.powersupply[0].positive+" "+this.powersupply[0].negative+" "+this.powersupply[0].voltage+"\n";
    if(this.powersupply[1].positive != this.powersupply[1].negative)
      this.SPICE += "V2 "+this.powersupply[1].positive+" "+this.powersupply[1].negative+" "+this.powersupply[1].voltage+"\n";
    if(this.signalgenerator.positive != this.signalgenerator.negative){
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
      if(this.signalgenerator.waveType == "sine")
        this.SPICE += "V3 "+this.signalgenerator.positive+" "+this.signalgenerator.negative+" SINE(0 "+this.signalgenerator.voltage+" "+this.signalgenerator.frequency+") ac 1\n";
      else 
        this.SPICE += "V3 "+this.signalgenerator.positive+" "+this.signalgenerator.negative+" PULSE("+pulseParams.V1+" "+pulseParams.V2+" "+pulseParams.Td+" "+pulseParams.Tr+" "+pulseParams.Tf+" "+pulseParams.Pw+" "+pulseParams.Per+" "+pulseParams.Phase+")\n";
    }
  }

  spiceConvert_simulation(){
    this.SPICE += '.control\n'
      if(this.oscilloscope[0].positive != '0' || this.oscilloscope[1].positive != '0' ){
        this.vbs("Setting up a transient simulation for Voltage");
        this.SPICE += this.oscilloscope[0].line;
        this.SPICE += '\nrun\n'
        var printline = "print";
        for(var i in this.oscilloscope) if(this.oscilloscope[i].positive != this.oscilloscope[i].negative)
        if(this.oscilloscope[i].positive && this.oscilloscope[i].negative && this.oscilloscope[i].negative != '0')
          if(this.oscilloscope[i].transformation.type)
            if(this.oscilloscope[i].transformation.type == 'log')
              printline += ' log(v('+this.oscilloscope[i].positive+','+this.oscilloscope[i].negative+'))'
            else if(this.oscilloscope[i].transformation.type == 'mult' && this.oscilloscope[i].transformation.factor)
              printline += ' '+this.oscilloscope[i].transformation.factor+'*(v('+this.oscilloscope[i].positive+','+this.oscilloscope[i].negative+'))'
            else if(this.oscilloscope[i].transformation.type == 'diff' && this.oscilloscope[i].transformation.factor)
              printline += ' (v('+this.oscilloscope[i].positive+','+this.oscilloscope[i].negative+')-'+this.oscilloscope[i].transformation.factor+')'
            else
              printline += ' v('+this.oscilloscope[i].positive+','+this.oscilloscope[i].negative+')'
          else
            printline += ' v('+this.oscilloscope[i].positive+','+this.oscilloscope[i].negative+')'
        else
          if(this.oscilloscope[i].transformation.type)
            if(this.oscilloscope[i].transformation.type == 'log')
              printline += ' log(v('+this.oscilloscope[i].positive+'))'
            else if(this.oscilloscope[i].transformation.type == 'mult' && this.oscilloscope[i].transformation.factor)
              printline += ' '+this.oscilloscope[i].transformation.factor+'*(v('+this.oscilloscope[i].positive+'))'
            else if(this.oscilloscope[i].transformation.type == 'diff' && this.oscilloscope[i].transformation.factor)
              printline += ' (v('+this.oscilloscope[i].positive+')-'+this.oscilloscope[i].transformation.factor+')'
            else
              printline += ' v('+this.oscilloscope[i].positive+')'
          else
            printline += ' v('+this.oscilloscope[i].positive+')'
        if(this.oscilloscope[0].positive != this.oscilloscope[i].negative || this.oscilloscope[i].positive != this.oscilloscope[0].negative)
          this.SPICE += printline+'\n';
      }
      if(this.powersupply[0].positive && this.powersupply[0].negative)
        this.SPICE += "dc V1 "+this.powersupply[0].voltage+" "+this.powersupply[0].voltage+" 0.1\n"
      if(this.powersupply[1].positive && this.powersupply[1].negative)
        this.SPICE += "dc V2 "+this.powersupply[0].voltage+" "+this.powersupply[0].voltage+" 0.1\n" 
      if(this.signalgenerator.positive && this.signalgenerator.negative)
        this.SPICE += "dc V3 "+this.signalgenerator.voltage+" "+this.signalgenerator.voltage+" 0.1\n" 
      this.SPICE += "run\n";
      var printline = 'print'
      for(var i of this.multimeternodes){
        if(i.hasOwnProperty('value') && i.hasOwnProperty('+') && i.hasOwnProperty('-')){
          if(i['+'] == 0 && i['-'] == 0)
            void(0)
          else if(i['+'] == 0)
            printline += " -1*v("+i['-']+")/"+i['value'];
          else if(i['-'] == 0)
            printline += " v("+i['+']+")/"+i['value'];
          else
            printline += " v("+i['+']+","+i['-']+")/"+i['value'];
        }else{
          if(i != 0)
            printline += " v("+i+")"
        }
      }
      this.SPICE += printline+'\n';
    this.SPICE += '.endc'
  }
}