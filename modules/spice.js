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
    simple:null,
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
            if(type == 'X'  && this.simple.hasOwnProperty('X') && this.simple.X  && !inSubcircuit){
                for(var t of this.simple.X){
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
            }else if(this.simple.hasOwnProperty(type) && !inSubcircuit){
                var Directional = true;
                if(this.simple[type].Directional == false)
                    Directional = false
                var Fungible = true;
                    if(this.simple[type].Fungible == false)
                        Fungible = false
                var InternalFungibility = false;
                    if(this.simple[type].hasOwnProperty('InternalFungibility'))
                        InternalFungibility = this.simple[type].InternalFungibility;
                const Component = {
                    Name:c.substring(0,c.indexOf(' ')),
                    Type:this.simple[type].Name,
                    Ports:JSON.parse(JSON.stringify(this.simple[type].Ports)),
                    CSS:this.simple[type].CSS,
                    Value:null,
                    Class:null,
                    Height:this.simple[type].Height,
                    Width:this.simple[type].Width,
                    Label:this.simple[type].Label,
                    Directional:Directional,
                    Fungible:Fungible,
                    InterPortSpace:this.simple[type].InterPortSpace
                }
                if(this.simple[type].Value)
                    Component.Value = params[this.simple[type].Value];
                if(this.simple[type].Class)
                    Component.Class = params[this.simple[type].Class];
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
    }
}

module.exports = Spice;