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
    SpiceCommand:null,
    SpiceRegex:/[0-9]{1,4}\t[0-9]+\.[0-9]+(e(\+|\-)[0-9]+)?.+/g,
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
    LabelRegex:/Index.+/g,
    simple:{
        R:{
            Name:'Resistor',
            Image:'../public/images/resistor-physical.svg',
            CSS:'position:absolute;background-size:100px;background-repeat:no-repeat;background-image:url(../public/images/resistor-physical.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
            Directional:false,
            InterPortSpace:[{
                top:47,
                height:6,
                left:30,
                width:35
            }],
            Ports:[{
                id:1,
                top:47,
                left:2,
                height:6,
                width:28,
                position:1,
                bindPosition:{
                    left:-3,
                    top:0
                }
            },{
                id:2,
                top:47,
                left:65,
                height:6,
                width:32,
                position:2,
                bindPosition:{
                    left:29,
                    top:0
                }
            }],
            Label:{
                "top":-5,
                "left":40
            },
            Class:null,
            Value:3
            },
        C:{
            Name:'Capacitor',
            Image:'../public/Images/cap-physical.svg',
            CSS:'position:absolute;background-size:50px;background-repeat:no-repeat;background-image:url(../public/images/cap-physical.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
            Directional:false,
            InterPortSpace:[{
                top:76,
                height:20,
                left:43,
                width:15
            }],
            Ports:[{
                        id:1,
                        top:76,
                        left:37,
                        height:20,
                        width:6,
                        position:1,
                        bindPosition:{
                            left:0,
                            top:14
                        }
                    },{
                        id:2,
                        top:76,
                        left:58,
                        height:20,
                        width:6,
                        position:2,
                        bindPosition:{
                            left:0,
                            top:14
                        }
                    }],
            Label:{
                    "top":-20,
                    "left":17
                },
            Class:null,
            Value:3
        },
        L:{
                Name:'Inductor',
                Ports:[1,2],
                Class:null,
                Value:3,
                Directional:false,
        },
        Q:{
                Name:'BJT',
                Ports:[{
                    id:'B',
                    top:50,
                    left:34,
                    height:50,
                    width:6,
                    bindPosition:{
                        left:34,
                        top:44
                    },
                    labelPosition:{
                        left:-10,
                        top:47
                    }
                },{
                    id:'E',
                    top:50,
                    left:45,
                    height:50,
                    width:6,
                    bindPosition:{
                        left:45,
                        top:44
                    },
                    labelPosition:{
                        left:0,
                        top:47
                    }
                },{
                    id:'C',
                    top:50,
                    left:57,
                    height:50,
                    width:6,
                    bindPosition:{
                        left:57,
                        top:44
                    },
                    labelPosition:{
                        left:10,
                        top:47
                    }
                }],
                InterPortSpace:[{
                    top:50,
                    height:50,
                    left:34,
                    width:18
                }],
                Image:'../public/images/transistor-physical.svg',
                CSS:'position:absolute;background-size:50px;background-repeat:no-repeat;background-image:url(../public/images/transistor-physical.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
                Height:100,
                Width:100,
                Class:{
                    position:5
                },
                Label:{
                    top:-20,
                    left:12
                },
                Value:null
        },
        M:{
                Name:'MOSFET',
                Ports:['S','B','D'],
                Class:5,
                Value:null,
        },
        D:{
            Name:'Diode',
            Image:'../public/Images/smd-diode.svg',
            CSS:'position:absolute;background-size:50px;background-repeat:no-repeat;background-image:url(../public/images/smd-diode.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
            Directional:false,
            InterPortSpace:[{
                top:76,
                height:20,
                left:43,
                width:15
            }],
            InterPortSpace:[{
                top:47,
                height:6,
                left:30,
                width:35
            }],
            Ports:[{
                id:1,
                top:47,
                left:2,
                height:6,
                width:28,
                position:1,
                bindPosition:{
                    left:-3,
                    top:0
                }
            },{
                id:2,
                top:47,
                left:65,
                height:6,
                width:32,
                position:2,
                bindPosition:{
                    left:29,
                    top:0
                }
            }],
            Label:{
                    "top":-20,
                    "left":17
                },
            Class:null,
            Value:3
        },
        J:{
                Name:'JFET',
                Ports:['S','B','D'],
                Class:4,
                Value:null,
        },
        VariableResistor:{
            Name:'VariableResistor',
            Image:'../public/images/vres.svg',
            CSS:'position:absolute;background-size:100px;background-repeat:no-repeat;background-image:url(../public/images/vres.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
            InterPortSpace:[{
                top:48,
                height:4,
                left:34,
                width:33
            }],
            Ports:[{
                id:'+',
                top:72,
                left:32,
                height:22,
                width:7,
                position:1,
                bindPosition:{
                    left:-3,
                    top:0
                },
                labelPosition:{
                    left:-13,
                    top:-11
                },
                CSS:"background:black;position:absolute;"
            },{
                id:'-',
                top:72,
                left:60,
                height:22,
                width:7,
                position:2,
                bindPosition:{
                    left:29,
                    top:0
                },
                labelPosition:{
                    left:12,
                    top:-11
                },
                CSS:"background:black;position:absolute;"
            }],
            Label:{
                "top":-5,
                "left":40
            },
            Value:3
        },
        X:[{
                Name:'LT1008',
                CSS:`position:absolute;background-size:200px;background-image:url(../public/images/8pin-DIP.svg);width:200px;height:200px;background-position-x:center;background-position-y:center;`,
                Image:'../public/images/8pin-DIP.svg',
                Height:200,
                Width:200,
                InterPortSpace:[{
                    top:47,
                    height:6,
                    left:30,
                    width:35
                }],
                Ports:[{
                    id:'II',
                    top:89,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'NII',
                    top:55,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'V+',
                    top:55,
                    left:150,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'V-',
                    top:125,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'O',
                    top:89,
                    left:150,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'C1',
                    top:21,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'C2',
                    top:21,
                    left:150,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                }],
                Value:null,
                Label:{
                    "top":70,
                    "left":50
                },
            },{
                Name:'LM741',
                CSS:`position:absolute;background-size:200px;background-image:url(../public/images/8pin-DIP.svg);width:200px;height:200px;background-position-x:center;background-position-y:center;`,
                Image:'../public/images/8pin-DIP.svg',
                Height:200,
                Width:200,
                InterPortSpace:[{
                    top:47,
                    height:6,
                    left:30,
                    width:35
                }],
                Ports:[{
                    id:'II',
                    top:89,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'NII',
                    top:55,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'V+',
                    top:55,
                    left:150,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'V-',
                    top:125,
                    left:31,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                },{
                    id:'O',
                    top:89,
                    left:150,
                    height:14,
                    width:20,
                    CSS:"background:black;position:absolute;"
                }],
                Value:null,
                Label:{
                    "top":70,
                    "left":50
                },
            }]
        },
    SPICE_to_Components: function(netlist){
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
            if(type == 'X'  && this.simple.hasOwnProperty('X') && this.simple.X  && !inSubcircuit){
                console.log(c)
                for(var t of this.simple.X){
                    if(t.Name == params.slice(-1)[0].replace(/[^A-z0-9]/gi, '')){
                        console.log("found it:"+t.Name)
                        var Component = {
                            Name:c.substring(0,c.indexOf(' ')),
                            Type:t.Name,
                            Ports:t.Ports,
                            CSS:t.CSS,
                            Value:null,
                            Class:null,
                            Height:t.Height,
                            Width:t.Width,
                            Label:t.Label,
                            InterPortSpace:t.InterPortSpace
                        }
                        if(t.Name)
                            Component.Value = t.Name;
                        if(t.Class)
                            Component.Class = t.Name;
                        for(var p=0;p<Component.Ports.length;p++)
                            Component.Ports[p].node = c.split(" ")[(p+1)];
                        components.push(Component)
                    }else{
                        console.log(t.Name+"!="+params.slice(-1))
                    }
                }
            }else if(this.simple.hasOwnProperty(type) && !inSubcircuit){
                var Component = {
                    Name:c.substring(0,c.indexOf(' ')),
                    Type:this.simple[type].Name,
                    Ports:this.simple[type].Ports,
                    CSS:this.simple[type].CSS,
                    Value:null,
                    Class:null,
                    Height:this.simple[type].Height,
                    Width:this.simple[type].Width,
                    Label:this.simple[type].Label,
                    InterPortSpace:this.simple[type].InterPortSpace
                }
                if(this.simple[type].Value)
                    Component.Value = params[this.simple[type].Value];
                if(this.simple[type].Class)
                    Component.Class = params[this.simple[type].Class];
                for(var p=0;p<Component.Ports.length;p++)
                    Component.Ports[p].node = c.split(" ")[(p+1)];
                components.push(Component)
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
        const DIGOUTPUT = netlist.match(/\* DIGOUTPUT: ([0-1] ){7}[0-1]/g);
        const AOUTPUT = netlist.match(/\* AOUTPUT:.+/g); 
        var output = {
            "Digital":null,
            "Analog":null
        }
        if(DIGOUTPUT)
            if(DIGOUTPUT.length == 1)
                output.Digital = DIGOUTPUT[0].replace("* DIGOUTPUT: ",'').split(' ');
        if(AOUTPUT)
            if(AOUTPUT.length == 1)
                output.Analog = AOUTPUT[0].replace("* AOUTPUT: ",'').split(' ');
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
            var parameters = {}
            if(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g.test(params[0])){
                simType = 'transient';
                parameters = {
                    step:params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g)[0].split(' ')[1],
                    time:params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){2}/g)[0].split(' ')[2]
                }
            }
            else if(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg|G|T)?){3}/g.test(params[0])){
                simType = 'ac';
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
                parameters:parameters
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
    ValidateCircuit(netlist1,netlist2,callback,errorCallback){
        var match = true;
        var feedback = "";
        console.log("Performing Circuit Validation")
        var c = [{
            components:netlist1.match(/^(R|C|L|(XU))[A-z0-9]( [A-z0-9]){2,8} (([0-9]+(f|p|n|u|m|k|Meg|G|T)?)|([A-z0-9]+))$/gm),
            sources:netlist1.match(/^V[A-z0-9]( [A-z0-9]){2} (([0-9]+(f|p|n|u|m|k)?)|((SINE|EXP|PULSE)\([A-z0-9 .]+\)))$/gm)
        },{
            components:netlist2.match(/^(R|C|L|(XU))[A-z0-9]( [A-z0-9]){2,8} (([0-9]+(f|p|n|u|m|k|Meg|G|T)?)|([A-z0-9]+))$/gm),
            sources:netlist2.match(/^V[A-z0-9]( [A-z0-9]){2} (([0-9]+(f|p|n|u|m|k|Meg|G|T)?)|((SINE|EXP|PULSE)\([A-z0-9 .]+\)))$/gm)
        }]
        //eliminate null components (all ports are grounded)
        if(c[0].components)
            for(var i=0;i<c[0].components.length;i++)
                if(/^(R|C|L|XU)[A-z0-9]( 0){2,8} [0-9]+(f|p|n|u|m|k)?$/gm.test(c[0].components[i]))
                    delete c[0].components[i]
        if(c[1].components)
            for(var i=0;i<c[1].components.length;i++)
                if(/^(R|C|L|XU)[A-z0-9]( 0){2,8} [0-9]+(f|p|n|u|m|k)?$/gm.test(c[1].components[i]))
                    delete c[1].components[i]
        console.log(c[0].components)
        console.log(c[1].components)

        if(c[0].components && c[1].components && match) //ensure that each circuit has components
            if(c[0].components.length == c[1].components.length){ //ensure that the number of components is equal
                for(var i=0;i<c[0].components.length;i++) if(c[0].components[i]){ // iterate through each component in the solution circuit
                    var matchFound = false; //assume that the component doesn't have a match (variable tracks whether a specific component has a match)
                    var c1 = { // establish circuit parameters
                        type:c[0].components[i].substring(0,1), // type (resistor, capacitor, opamp)
                        nodes:c[0].components[i].split(" "),
                        value:Spice.spice_shorthand(c[0].components[i].split(" ").pop()) //get value (final position)
                    }
                    c1.nodes.shift();
                    c1.nodes.pop();
                    for(var j=0;j<c[1].components.length;j++) if(c[1].components[j]){ //iterate through each component in submission circuit
                        var c2 = { //establish circuit parameters
                            type:c[1].components[j].substring(0,1),
                            nodes:c[1].components[j].split(" "),
                            value:Spice.spice_shorthand(c[1].components[j].split(" ").pop())
                        }
                        c2.nodes.shift();
                        c2.nodes.pop();
                        if(c1.type == c2.type && c1.value == c2.value) //if the submission circuit component in question has the same value and is of the same type
                            if(this.simple.hasOwnProperty(c1.type)){ //check to see if the circuit is directional or not 
                                var isDirectional = true; //assume it is unless specified otherwise
                                if(this.simple[c1.type].hasOwnProperty('Directional'))
                                    if(this.simple[c1.type].Directional == false)
                                        isDirectional = false;
                                if(!isDirectional){ // if the circuit isn't directional
                                    if(c1.nodes.sort().join(" ") == c2.nodes.sort().join(" ")) //check for equality between the nodes
                                        matchFound = true; //if the nodes exactly match after sorting then the component exists in both in precisely the same configuration
                                }
                                else
                                   if(c1.nodes.join(" ") == c2.nodes.join(" ")) //check for equality
                                        matchFound = true; //if the nodes match exactly then the component exists in both circuits in precisely the same configuration
                            }
                    }
                    if(!matchFound){ //if a match hasn't been found after iterating through the entire circuit then we can say that there is a mismatched component
                        match = false; // and the circuit doesn't match
                        feedback += c[0].components[i].split(" ")[0] + " failed to match\n"
                    }
                }
            }
        if(match){
            console.log("Basic Matching Passes - checking inputs and outputs");
            Spice.Output_Comparison(netlist1,netlist2,callback,errorCallback);
        }
        else
            errorCallback("Failed basic component matching: "+feedback);
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
        this.SpiceSimulate(netlist,testData,error);
    },
    SpiceSimulate(netlist,callback,errorFunction){
        tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
            if(err) errorFunction(err);
            fs.writeFileSync(path,netlist);
            const ls = spawn(Spice.SpiceCommand, [path]);
            var scopeData = [];
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
              var scopes = rawData.match(Spice.SpiceRegex);
              var labels = rawData.match(Spice.LabelRegex);
              if(labels)
                if(labels.length)
                    labels = labels[0].match(/[A-z0-9\*\(\)\/,]+/g,'');
              console.log(netlist.split('\n')[0]);
              console.log(labels)
              var scopeData = [];
              if(scopes) if(scopes.length){
                var sampleStep = 1;
                if(scopes.length > 1000)
                    sampleStep = Math.round(scopes.length/1000);
                for(var s=0;s<scopes.length;s=s+sampleStep){
                    var e = scopes[s].split("\t");
                    if(e && labels)
                        if(e.length && labels.length){
                            if(labels.length == 3)
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:"Output"})
                            else if(labels.length == 4){
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:"Output"})
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[3]),c:"Input"})
                            }else if(labels.length > 4 && labels.length == (e.length-2)){
                                for(var i=2;i<(e.length-2);i++)
                                    scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:(i-2)})
                            }
                        }
                }
            }
            if(scopeData.length)
                callback(scopeData)
            else
                errorFunction("ngSPICE Simulation returned no data - check your circuit");
            });
        });
    },
    Output_Comparison(netlist1,netlist2,callback,errorFunction){
        console.log("Within Output Comparison Function");
        console.log(netlist1);
        console.log(netlist2);
        Spice.SpiceSimulate(netlist1,function(scopeData1){
            Spice.SpiceSimulate(netlist2,function(scopeData2){
                console.log("Performing Signal Comparison");
                var signals = [{
                    input:[],
                    output:[],
                    time:[scopeData1[0].x,scopeData1.pop().x],
                    range:{
                        input:[],
                        output:[]
                    }
                },{
                    input:[],
                    output:[],
                    time:[scopeData2[0].x,scopeData2.pop().x],
                    range:{
                        input:[],
                        output:[]
                    }
                }]
                for(var i=0;i<scopeData1.length;i++)
                    if(scopeData1[i].c == 'Input')
                        signals[0].input.push(scopeData1[i].y)
                    else if(scopeData1[i].c == 'Output')
                        signals[0].output.push(scopeData1[i].y)
                for(var i=0;i<scopeData2.length;i++)
                    if(scopeData2[i].c == 'Input')
                        signals[1].input.push(scopeData2[i].y)
                    else if(scopeData2[i].c == 'Output')
                        signals[1].output.push(scopeData2[i].y)                 
                signals[0].range.input = [Math.min.apply(null,signals[0].input),Math.max.apply(null,signals[0].input)]
                signals[0].range.output = [Math.min.apply(null,signals[0].output),Math.max.apply(null,signals[0].output)]
                signals[1].range.input = [Math.min.apply(null,signals[1].input),Math.max.apply(null,signals[1].input)]
                signals[1].range.output = [Math.min.apply(null,signals[1].output),Math.max.apply(null,signals[1].output)]
                var SignalStats = {
                    Signals:[scopeData1,scopeData2],
                    Polling_Length:Math.min(signals[0].input.length,signals[1].input.length),
                    Vector_Length_Error:Math.max(signals[0].input.length,signals[1].input.length)-Math.min(signals[0].input.length,signals[1].input.length),
                    Time_Error:Math.max(signals[0].time[1],signals[1].time[1])/Math.min(signals[0].time[1],signals[1].time[1])-1,
                    Input:{
                        Divisor:Math.min(signals[0].range.input[1],signals[1].range.input[1]),
                        Max_Value_Error:Math.max(signals[0].range.input[1],signals[1].range.input[1])/Math.min(signals[0].range.input[1],signals[1].range.input[1])-1,
                        Min_Value_Error:Math.max(signals[0].range.input[0],signals[1].range.input[0])/Math.min(signals[0].range.input[0],signals[1].range.input[0])-1,
                        Total_Error:0,
                        Normalised_Error:0
                    },
                    Output:{
                        Divisor:Math.min(signals[0].range.output[1],signals[1].range.output[1]),
                        Max_Value_Error:Math.max(signals[0].range.output[1],signals[1].range.output[1])/Math.min(signals[0].range.output[1],signals[1].range.output[1])-1,
                        Min_Value_Error:Math.max(signals[0].range.output[0],signals[1].range.output[0])/Math.min(signals[0].range.output[0],signals[1].range.output[0])-1,
                        Total_Error:0,
                        Normalised_Error:0
                    }
                }
                for(var i=0;i<SignalStats.Polling_Length;i++){
                    SignalStats.Input.Total_Error += Math.abs(signals[0].input[i]-signals[1].input[i])
                    SignalStats.Output.Total_Error += Math.abs(signals[0].output[i]-signals[1].output[i])
                }
                SignalStats.Input.Normalised_Error = SignalStats.Input.Total_Error/SignalStats.Input.Divisor
                SignalStats.Output.Normalised_Error = SignalStats.Output.Total_Error/SignalStats.Output.Divisor
                console.log(SignalStats);
                if(SignalStats.Input.Normalised_Error < 1 && SignalStats.Output.Normalised_Error < 1){
                    console.log("Valid Circuit");
                    callback(SignalStats);
                }else{
                    console.log("invalid Circuit");
                    errorFunction(SignalStats)
                }
            },function(error){
                console.log(error);
                errorFunction(error);
            })
        },function(error){
            console.log(error)
            errorFunction(error);
        })
    },
    ImageSimulate(netlist,callback,errorFunction){
        var SpiceCallback = function(scopeData){
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
                graph("Circuit Output",scopeData,xLabel,yLabel,callback,errorFunction);
            }
            else if(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?)+/g.test(netlist)){
                if(netlist.includes("ac dec")){
                    graph("Circuit Output",scopeData,"Frequency","Voltage",callback,errorFunction);
                }else if(netlist.includes("ac lin"))
                    graph("Circuit Output",scopeData,"Frequency","Voltage",callback,errorFunction);
                
            }
        }
        this.SpiceSimulate(netlist,SpiceCallback,errorFunction)
    }
}

module.exports = Spice;