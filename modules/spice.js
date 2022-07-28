const cheerio = require('cheerio');
const graph = require('./graph');
const tmp = require('tmp');
const fs = require('fs');
const { spawn } = require('child_process');
const { off } = require('process');
const { id } = require('vega');
/*
RULES: Source must be listed in the correct order
Terms can only be seperated by spaces not commas
*/
var Spice = {
    SpiceCommand:"C:\\Users\\Optiplex7090\\Desktop\\ELEC2133\\ELI-LabRun\\src\\ngspice_con.exe",
    SpiceRegex:/-?[0-9]{1,4}\t[0-9]+\.[0-9]+(e(\+|\-)[0-9]+)?.+/g,
    DCRegex:/(v|i)\([0-9]+(,[0-9]+)?\)((\+|\-|\*|\/)[0-9]+(f|p|n|u|m|k|Meg|G))? = \-?[0-9]+\.[0-9]+(e(\+|\-)[0-9]+)?.+/g,
    ShorthandRegex:/[0-9]+(f|p|n|u|m|k|Meg|G)/g,
    Shorthand:{
      'f':1e9,
      'p':1e-12,
      'n':1e-9,
      'u':1e-6,
      'm':1e-3,
      'k':1e3,
      'Meg':1e6,
      'G':1e9,
      'T':1e12,
    },
    LabelRegex:/\* INDEX = .+/g,
    ComponentSet:null,
    SPICE_to_Components: function(netlist,alts){
        var components = [];
        const lines = netlist.split("\n");
        var inSubcircuit = false;
        for(const c of lines){
            if(c == ".control")
                break;
            if(c.toLowerCase().includes("subckt"))
                inSubcircuit = true;
            if(c.toLowerCase().includes(".ends"))
                inSubcircuit = false;
            var type = c.substring(0,1);
            const params = c.split(" ");
            if(c.substring(0,8) == ('RAmmeter'))
                type = 'Ammeter'
            else if(c.substring(0,9) == ('RVariable'))
                type = 'VariableResistor'
            else if(c.substring(0,7) == ('RJumper'))
                type = 'Jumper'
            if(type == 'X'  && this.ComponentSet.hasOwnProperty('X') && this.ComponentSet.X  && !inSubcircuit){
                for(var t of this.ComponentSet.X){
                    if(t.Name == params.slice(-1)[0].replace(/[^A-z0-9]/gi, '')){
                        var Directional = true;
                        if(t.Directional == false)
                            Directional = false
                        var Fungible = true;
                            if(t.Fungible == false)
                                Fungible = false
                        var InternalFungibility = false;
                            if(t.hasOwnProperty('InternalFungibility'))
                                InternalFungibility = t.InternalFungibility;
                        const Component = {
                            Name:c.substring(0,c.indexOf(' ')),
                            Type:t.Name,
                            Ports:JSON.parse(JSON.stringify(t.Ports)),
                            CSS:t.CSS,
                            Value:null,
                            Class:null,
                            Height:t.Height,
                            Width:t.Width,
                            Label:t.Label,
                            Directional:Directional,
                            Fungible:Fungible,
                            InternalFungibility:InternalFungibility,
                            InterPortSpace:t.InterPortSpace,
                            Groups:new Array(5),
                        }
                        if(t.Name)
                            Component.Value = t.Name;
                        if(t.Class)
                            Component.Class = t.Name;
                        if(t.Ports)
                            Component.Ports = JSON.parse(JSON.stringify(t.Ports))
                        for(var p=0;p<Component.Ports.length;p++){
                            Component.Ports[p].node = c.split(" ")[(p+1)];
                            if(Component.Ports[p].group && Component.Ports[p].type){
                                if(!Component.Groups.hasOwnProperty(Component.Ports[p].group))
                                    Component.Groups[Component.Ports[p].group] = [];
                                Component.Groups[Component.Ports[p].group][Component.Ports[p].type] = Component.Ports[p].node;
                            }
                        }
                        components.push(Component)
                    }
                }
            }else if(this.ComponentSet.hasOwnProperty(type) && !inSubcircuit){
                var Directional = true;
                if(this.ComponentSet[type].Directional == false)
                    Directional = false
                var Fungible = true;
                    if(this.ComponentSet[type].Fungible == false)
                        Fungible = false
                var InternalFungibility = false;
                    if(this.ComponentSet[type].hasOwnProperty('InternalFungibility'))
                        InternalFungibility = this.ComponentSet[type].InternalFungibility;
                const Component = {
                    Name:c.substring(0,c.indexOf(' ')),
                    Type:this.ComponentSet[type].Name,
                    Ports:JSON.parse(JSON.stringify(this.ComponentSet[type].Ports)),
                    CSS:this.ComponentSet[type].CSS,
                    Value:null,
                    Class:null,
                    Height:this.ComponentSet[type].Height,
                    Width:this.ComponentSet[type].Width,
                    Label:this.ComponentSet[type].Label,
                    Directional:Directional,
                    Fungible:Fungible,
                    InterPortSpace:this.ComponentSet[type].InterPortSpace
                }
                if(this.ComponentSet[type].Value)
                    Component.Value = params[this.ComponentSet[type].Value];
                if(this.ComponentSet[type].Class)
                    Component.Class = params[this.ComponentSet[type].Class];
                for(var p=0;p<Component.Ports.length;p++){
                    Component.Ports[p].node = c.split(" ")[(p+1)];
                }
                components.push(Component)
            }
        }
        if(alts)
            for(var c in components)
                for(var p in components[c].Ports){
                    components[c].Ports[p].altnodes = new Array(alts.length)
                    for(var a in alts)
                        for(var co of alts[a].Components)
                            if(co.Name == components[c].Name){
                                for(var po of co.Ports)
                                    if(po.id ==  components[c].Ports[p].id){
                                        components[c].Ports[p].altnodes[a] = po.node;
                                    }
                            }
                }                               
        return components;
    },
    SPICE_to_Instructions: function(netlist){
        const instructions = netlist.match(/\* INSTRUCTIONS:.+/g)
        if(instructions) 
            if(instructions.length) 
                return instructions[0].replace(/\\n/g,'\n').replace(/\* ?INSTRUCTIONS:/g,"").trim();
            else return "No Specific Instructions Provided";
        else return "No Specific Instructions Provided";
    },
    SPICE_to_OUTPUT: function(netlist){
        const DIGOUTPUT0_PRE = netlist.match(/\* DIGOUTPUT0_PRE = ([0-1] ){7}[0-1]/g);
        const DIGOUTPUT1_PRE = netlist.match(/\* DIGOUTPUT1_PRE = ([0-1] ){7}[0-1]/g);
        const DIGOUTPUT0_POST = netlist.match(/\* DIGOUTPUT0_POST = ([0-1] ){7}[0-1]/g);
        const DIGOUTPUT1_POST = netlist.match(/\* DIGOUTPUT1_POST = ([0-1] ){7}[0-1]/g);
        const AOUTPUT0_PRE = netlist.match(/\* AOUTPUT0_PRE = .+/g); 
        const AOUTPUT1_PRE = netlist.match(/\* AOUTPUT1_PRE = .+/g); 
        const AOUTPUT0_POST = netlist.match(/\* AOUTPUT0_POST = .+/g); 
        const AOUTPUT1_POST = netlist.match(/\* AOUTPUT1_POST = .+/g); 
        const AOUTPUT0_DEVICE = netlist.match(/\* AOUTPUT0_DEVICE = .+/g); 
        const AOUTPUT0_MINV = netlist.match(/\* AOUTPUT0_MINV = .+/g); 
        const AOUTPUT0_MAXV = netlist.match(/\* AOUTPUT0_MAXV = .+/g); 
        const AOUTPUT1_DEVICE = netlist.match(/\* AOUTPUT1_DEVICE = .+/g); 
        const AOUTPUT1_MINV = netlist.match(/\* AOUTPUT1_MINV = .+/g); 
        const AOUTPUT1_MAXV = netlist.match(/\* AOUTPUT1_MAXV = .+/g); 
        var output = {
            Pre:{
                "Digital":[],
                "Analog":[]
            },
            Post:{
                "Digital":[],
                "Analog":[]
            },
            AnalogDevices:[null,null]
        }
        if(DIGOUTPUT0_PRE)
            if(DIGOUTPUT0_PRE.length == 1)
                output.Pre.Digital[0] = DIGOUTPUT0_PRE[0].replace("* DIGOUTPUT0_PRE = ",'').split(' ');
        if(DIGOUTPUT1_PRE)
            if(DIGOUTPUT1_PRE.length == 1)
                output.Pre.Digital[1] = DIGOUTPUT1_PRE[0].replace("* DIGOUTPUT1_PRE = ",'').split(' ');
        if(DIGOUTPUT0_POST)
            if(DIGOUTPUT0_POST.length == 1)
                output.Post.Digital[0] = DIGOUTPUT0_POST[0].replace("* DIGOUTPUT0_POST = ",'').split(' ');
        if(DIGOUTPUT1_POST)
            if(DIGOUTPUT1_POST.length == 1)
                output.Post.Digital[1] = DIGOUTPUT1_POST[0].replace("* DIGOUTPUT1_POST = ",'').split(' ');
        if(AOUTPUT0_PRE)
            if(AOUTPUT0_PRE.length == 1)
                output.Pre.Analog[0] = AOUTPUT0_PRE[0].replace("* AOUTPUT0_PRE = ",'');
        if(AOUTPUT1_PRE)
            if(AOUTPUT1_PRE.length == 1)
                output.Pre.Analog[1] = AOUTPUT1_PRE[0].replace("* AOUTPUT1_PRE = ",'');
        if(AOUTPUT0_POST)
            if(AOUTPUT0_POST.length == 1)
                output.Post.Analog[0] = AOUTPUT0_POST[0].replace("* AOUTPUT0_POST = ",'');
        if(AOUTPUT1_POST)
            if(AOUTPUT1_POST.length == 1)
                output.Post.Analog[1] = AOUTPUT1_POST[0].replace("* AOUTPUT1_POST = ",'');
        if(AOUTPUT0_DEVICE && AOUTPUT0_MINV && AOUTPUT0_MAXV)
            if(AOUTPUT0_DEVICE.length == 1)
                output.AnalogDevices[0] = {
                    device:AOUTPUT0_DEVICE[0].replace("* AOUTPUT0_DEVICE = ",''),
                    min:AOUTPUT0_MINV[0].replace("* AOUTPUT0_MINV = ",''),
                    max:AOUTPUT0_MAXV[0].replace("* AOUTPUT0_MAXV = ",'')
                };
        if(AOUTPUT1_DEVICE && AOUTPUT1_MINV && AOUTPUT1_MAXV)
            if(AOUTPUT1_DEVICE.length == 1)
                output.AnalogDevices[1] = {
                    device:AOUTPUT1_DEVICE[0].replace("* AOUTPUT1_DEVICE = ",''),
                    min:AOUTPUT1_MINV[0].replace("* AOUTPUT1_MINV = ",''),
                    max:AOUTPUT1_MAXV[0].replace("* AOUTPUT1_MAXV = ",'')
                };
        return output;
    },
    SPICE_to_SimulationNotes: function(netlist){
        const instructions = netlist.match(/\* SIMULATION NOTES:.+/g)
        if(instructions) 
            if(instructions.length) 
                return instructions[0].replace(/\\n/g,'\n').replace(/\* ?SIMULATION NOTES:/g,"").trim();
            else return "No Specific Instructions For Simulation Provided";    
        else return "No Specific Instructions For Simulation Provided";
    },
    SPICE_to_ImplementationNotes: function(netlist){
        const instructions = netlist.match(/\* IMPLEMENTATION NOTES:.+/g)
        if(instructions) 
            if(instructions.length) 
                return instructions[0].replace(/\\n/g,'\n').replace(/\* ?IMPLEMENTATION NOTES:/g,"").trim();
            else return "No Specific Instructions For Implementation Provided";    
        else return "No Specific Instructions For Implementation Provided";
    },
    SPICE_to_Action_Function: function(netlist){
        const actionfunction = netlist.match(/\* ACTION FUNCTION: ?[A-z0-9_]+/g)
        if(actionfunction) 
            if(actionfunction.length) 
                return actionfunction[0].split('\n')[0].replace(/\\n/g,'\n').replace(/\* ?ACTION FUNCTION:/g,"").trim();
        else return null;
    },
    SPICE_Oscilloscope: function(netlist){
        const actionfunction = netlist.match(/print v\([A-z0-9_](,[A-z0-9_])?\)+/g)
        if(actionfunction) 
            if(actionfunction.length) 
                return actionfunction[0].split('\n')[0].replace(/\\n/g,'\n').replace(/print v\([A-z0-9_](,[A-z0-9_])?\)+/g,"").trim();
        else return null;
    },
    SPICE_SimulationParameters(netlist){
        var params = netlist.match(/.control.*.endc/isg);
        if(params){
            var simType = null;
            var parameters = {};
            var simLine = null;
            if(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g.test(params[0])){
                simType = 'transient';
                simLine = params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g)[0]
                parameters = {
                    step:params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g)[0].split(' ')[1],
                    time:params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g)[0].split(' ')[2]
                }
            }
            else if(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g.test(params[0])){
                simType = 'ac';
                simLine = params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g)[0];
                parameters = {
                    type:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g)[0].split(' ')[1],
                    step:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g)[0].split(' ')[2],
                    start:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g)[0].split(' ')[3],
                    stop:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g)[0].split(' ')[4],
                }
            }
            return {
                raw:params[0],
                type:simType,
                parameters:parameters,
                line:simLine
            }
        }
        else 
            return null;
    },
    SPICE_Subcircuit(netlist){
        var params = netlist.match(/.SUBCKT.*.ends [A-z0-9]+/isg);
        if(params)
            return params
        else 
            return null;
    },
    SPICE_Models(netlist){
        var params = netlist.match(/.MODEL .+/g);
        if(params)
            return params
        else 
            return [];
    },
    Board_to_SPICE(board){
        const $ = cheerio.load(board);
        nodes = [];

    },
    spice_shorthand(input){
        var multFactor = input.match(Spice.ShorthandRegex);
        if(multFactor)
            if(multFactor.length)
                if(Spice.Shorthand.hasOwnProperty(multFactor[0]))
                    return parseInt(terms[i])*Spice.Shorthand[multFactor[0]]
        return input
    },
    test(callback,error){
        const expectedOutput = 2.5;
        const netlist = `Test Circuit for Validation Purposes
        V1 1 0 5
        R1 1 2 1k
        R2 2 0 1k
        .control
        tran 50u 500m
        run
        print v(2)
        .endc`;
        function testData(scopes){
            var err = false;
            if(scopes.length < 10)
                err = true;
            for(var t of scopes)
                if(t.y != expectedOutput)
                    err = true;
            if(err) error("Specifically, the output from the NgSPICE test circuit gave a result that was unexpected. The test circuit is:\n\n"+netlist+"\n\nThe result should be "+expectedOutput+"(V) everywhere, however the result was:\n"+JSON.stringify(scopes,null,4))
            if(!err) callback();
        }
        this.SpiceSimulate(netlist,testData,function(data){},error);
    },
    SPICE_to_Bench(netlist,alts){
        const V1 = netlist.match(/V1 ([0-9]+ ){2}.+/g);
        const V2 = netlist.match(/V2 ([0-9]+ ){2}.+/g);
        const V3 = netlist.match(/V3 ([0-9]+ ){2}.+/g);
        var powersupply1_altnodes_positive = [];
        var powersupply1_altnodes_negative = [];
        var powersupply2_altnodes_positive = [];
        var powersupply2_altnodes_negative = [];
        var signalgenerator_altnodes_positive = [];
        var signalgenerator_altnodes_negative = [];
        if(alts)
            for(var a of alts){
                powersupply1_altnodes_positive.push(a.Bench.powersupply[0].positive);
                powersupply1_altnodes_negative.push(a.Bench.powersupply[0].negative);
                powersupply2_altnodes_positive.push(a.Bench.powersupply[1].positive);
                powersupply2_altnodes_negative.push(a.Bench.powersupply[1].negative);
                signalgenerator_altnodes_positive.push(a.Bench.signalgenerator.positive);
                signalgenerator_altnodes_negative.push(a.Bench.signalgenerator.negative);
            }
        if(V1 && V2 && V3){
            return {
                powersupply:[{
                    positive:V1[0].split(" ")[1],
                    negative:V1[0].split(" ")[2],
                    altnodes:{
                        positive:powersupply1_altnodes_positive,
                        negative:powersupply1_altnodes_negative
                    }
                },{
                    positive:V2[0].split(" ")[1],
                    negative:V2[0].split(" ")[2],
                    altnodes:{
                        positive:powersupply2_altnodes_positive,
                        negative:powersupply2_altnodes_negative
                    }
                }],
                signalgenerator:{
                    positive:V3[0].split(" ")[1],
                    negative:V3[0].split(" ")[2],
                    altnodes:{
                        positive:signalgenerator_altnodes_positive,
                        negative:signalgenerator_altnodes_negative
                    }
                }
            }
        }else
        return {
            powersupply:[{
                positive:null,
                negative:null,
                altnodes:{positive:[],negative:[]}
            },{
                positive:null,
                negative:null,
                altnodes:{positive:[],negative:[]}
            }],
            signalgenerator:{
                positive:null,
                negative:null,
                altnodes:{positive:[],negative:[]}
            }
        }
    },
    SpiceSimulate(netlist,callback,rawCallback,errorFunction){
        tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
            console.log("Spice Simulate - Called");
            if(err){
                errorFunction(err);
            }
            fs.writeFileSync(path,netlist);
            const ls = spawn(Spice.SpiceCommand, [path]);
            var scopeData = [];
            var DC = [];
            var rawData = "";
            ls.stdout.on('data', (data) => {
              rawData += data;
            });
            ls.stderr.on('error', (data) => {
                console.log("ERROR!");
                errorFunction(data);
            }); 
            ls.on('error', (error) =>{
                console.log("ERROR!")
                errorFunction(error);
            });
            ls.on('close', (code) => {
                rawCallback(rawData);
              var scopes = rawData.match(Spice.SpiceRegex);
              if(rawData.match(Spice.DCRegex))
                DC = rawData.match(Spice.DCRegex);
              var labels = ["Input","Output"];
              var includedLabels = null
              if(/Index.+/g.test(rawData))
                includedLabels = rawData.match(/Index.+/g);
                if(includedLabels)
                    labels = includedLabels[0].replace(/(Index|Time)/gi,'').replace(/\s+/g,' ').trim().split(' ');
              if(Spice.LabelRegex.test(netlist)){
                var specLabels = netlist.match(Spice.LabelRegex)[0];
                labels = specLabels.replace('* INDEX = ','').split(",");
              }
              else{

              }
              var scopeData = [];
              if(scopes) if(scopes.length){
                var sampleStep = 1;
                if(scopes.length > 1000)
                    sampleStep = Math.round(scopes.length/1000);
                for(var s=0;s<scopes.length;s=s+sampleStep){
                    var e = scopes[s].split("\t");
                    if(e && labels)
                            if(e.length == 4)
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:labels[0]})
                            else if(e.length == 5){
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:labels[0]})
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[3]),c:labels[1]})
                            }else if(e.length > 5){
                                for(var i=2;i<(e.length-1);i++)
                                    if((i-2) < labels.length)
                                        scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[i]),c:labels[(i-2)]})
                                    else
                                        scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[i]),c:(i-2)})
                            }
                }
            }
            if(scopeData.length || DC.length)
                callback(scopeData,DC)
            else
                errorFunction("ngSPICE Simulation returned no data - check your circuit");
            });
        });
    },
    ImageSimulate(netlist,imageCallback,rawCallback,multimeterCallback,errorFunction){
        console.log("Simulating Circuit Internal Function")
        var SpiceCallback = function(scopeData,DC){
            if(DC) if(DC.length)
                multimeterCallback(DC)
            if(scopeData) if(scopeData.length)
            if(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?)+/g.test(netlist)){
                var maxTime = scopeData[scopeData.length-1].x;
                var xLabel = "Time (s)";
                var yLabel = "Voltage (V)";
                var printstatement = netlist.match(/print .+/g)
                if(printstatement)
                    if(printstatement.length)
                        if(printstatement[0].includes('/'))
                            yLabel = "Current (A)"
                if(maxTime < 1e-6)
                  for(var i=0;i<scopeData.length;i++){
                    scopeData[i].x = scopeData[i].x*1e9;
                    xLabel = "Time (ns)"
                  }
                else if(maxTime < 1e-3)
                  for(var i=0;i<scopeData.length;i++){
                    scopeData[i].x = scopeData[i].x*1e6;
                    xLabel = "Time (us)"
                  }
                else if(maxTime < 1)
                  for(var i=0;i<scopeData.length;i++){
                    scopeData[i].x = scopeData[i].x*1e3;
                    xLabel = "Time (ms)"
                  }
                graph("Circuit Output",scopeData,xLabel,yLabel,imageCallback,errorFunction);
            }
            else if(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?)+/g.test(netlist)){
                if(netlist.includes("ac dec")){
                    graph("Circuit Output",scopeData,"Frequency","Voltage",imageCallback,errorFunction);
                }else if(netlist.includes("ac lin"))
                    graph("Circuit Output",scopeData,"Frequency","Voltage",imageCallback,errorFunction);
                
            }else{
                imageCallback("No Simulation Response");
            }else
                imageCallback("No Simulation Response");
            else
                imageCallback("No Simulation Response");
        }
        this.SpiceSimulate(netlist,SpiceCallback,rawCallback,errorFunction)
    },
    client: /*
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
        console.time();
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
          console.timeEnd();
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
            let connectedPorts = []
            for(var p in c.ports){
              if(!connectedPorts.includes(c.ports[p].nodes[0]))
                connectedPorts.push(c.ports[p].nodes[0])
            }
            if(connectedPorts.length > 1){
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
}

module.exports = Spice;