const cheerio = require('cheerio');
const graph = require('./graph');
const tmp = require('tmp');
const fs = require('fs');
const { spawn } = require('child_process');
const { off } = require('process');

var Spice = {
    SpiceCommand:null,
    SpiceRegex:/[0-9]{1,4}\t[0-9]+\.[0-9]+(e(\+|\-)[0-9]+)?.+/g,
    LabelRegex:/Index.+/g,
    simple:{
        R:{
            Name:'Resistor',
            Image:'/images/resistor-physical.svg',
            CSS:'position:absolute;background-size:100px;background-repeat:no-repeat;background-image:url(/images/resistor-physical.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
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
            Image:'Images/cap-physical.svg',
            CSS:'position:absolute;background-size:50px;background-repeat:no-repeat;background-image:url(/images/cap-physical.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
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
                Value:3
        },
        Q:{
                Name:'BJT',
                Ports:[{
                    id:'B',
                    top:50,
                    left:9,
                    height:50,
                    width:6,
                    bindPosition:{
                        left:9,
                        top:44
                    }
                },{
                    id:'E',
                    top:50,
                    left:21,
                    height:50,
                    width:6,
                    bindPosition:{
                        left:21,
                        top:44
                    }
                },{
                    id:'C',
                    top:50,
                    left:33,
                    height:50,
                    width:6,
                    bindPosition:{
                        left:33,
                        top:44
                    }
                }],
                InterPortSpace:[{
                    top:50,
                    height:50,
                    left:15,
                    width:18
                }],
                Image:'/images/transistor-physical.svg',
                CSS:'position:absolute;background-size:50px;background-repeat:no-repeat;background-image:url(/images/transistor-physical.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
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
                Ports:['P','N'],
                Class:3,
                Value:null
        },
        J:{
                Name:'JFET',
                Ports:['S','B','D'],
                Class:4,
                Value:null,
        },
        Ammeter:{
            Name:'Resistor',
            Image:'/images/ammeter.svg',
            CSS:'position:absolute;background-size:50px;background-repeat:no-repeat;background-image:url(/images/ammeter.svg);width:100px;height:100px;background-position-x:center;background-position-y:center;',
            Height:100,
            Width:100,
            InterPortSpace:[{
                top:48,
                height:4,
                left:34,
                width:33
            }],
            Ports:[{
                id:1,
                top:48,
                left:24,
                height:4,
                width:10,
                position:1,
                bindPosition:{
                    left:-3,
                    top:0
                }
            },{
                id:2,
                top:48,
                left:67,
                height:4,
                width:10,
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
            Value:3
        },
        X:{
                Name:'Subcircuit',
                CSS:`position:absolute;background-size:200px;background-image:url(/images/8pin-DIP.svg);width:200px;height:200px;background-position-x:center;background-position-y:center;`,
                Image:'/images/8pin-DIP.svg',
                Height:200,
                Width:200,
                InterPortSpace:[{
                    top:47,
                    height:6,
                    left:30,
                    width:35
                }],
                Ports:[{
                    id:'0',
                    top:21,
                    left:31,
                    height:14,
                    width:20
                },{
                    id:'1',
                    top:55,
                    left:31,
                    height:14,
                    width:20
                },{
                    id:'2',
                    top:89,
                    left:31,
                    height:7,
                    width:10
                },{
                    id:'3',
                    top:125,
                    left:31,
                    height:14,
                    width:20
                },{
                    id:'4',
                    top:125,
                    left:150,
                    height:14,
                    width:20
                },{
                    id:'5',
                    top:89,
                    left:150,
                    height:14,
                    width:20
                },{
                    id:'6',
                    top:55,
                    left:150,
                    height:14,
                    width:20
                },{
                    id:'7',
                    top:21,
                    left:150,
                    height:14,
                    width:20
                }],
                Class:[{

                }],
                Value:null,
                Label:{
                    "top":70,
                    "left":75
                },
            }
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
            if(this.simple.hasOwnProperty(type) && !inSubcircuit){
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
        const actionfunction = netlist.match(/print v\([A-z0-9_]\)+/g)
        if(actionfunction) 
            if(actionfunction.length) 
                return actionfunction[0].split('\n')[0].replace(/\\n/g,'\n').replace(/print v\([A-z0-9_]\)+/g,"").trim();
        else return null;
    },
    SPICE_SimulationParameters(netlist){
        var params = netlist.match(/.control.*.endc/isg);
        if(params){
            var simType = null;
            var parameters = {}
            if(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){2}/g.test(params[0])){
                simType = 'transient';
                parameters = {
                    step:params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){2}/g)[0].split(' ')[1],
                    time:params[0].match(/tran( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){2}/g)[0].split(' ')[2]
                }
            }
            else if(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){3}/g.test(params[0])){
                simType = 'ac';
                parameters = {
                    type:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){3}/g)[0].split(' ')[1],
                    step:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){3}/g)[0].split(' ')[2],
                    start:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){3}/g)[0].split(' ')[3],
                    stop:params[0].match(/ac (dec|lin|oct)( [0-9]+(\.[0-9]+)?(f|p|n|u|m|k|Meg)?){3}/g)[0].split(' ')[4],
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
    ValidateCircuit(netlist){
        return true;
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
        console.log(netlist)
        tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
            console.log(path);
            if(err) errorFunction(err);
            fs.writeFileSync(path,netlist);
            console.log(fs.readFileSync(path))
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
              var labels = rawData.match(Spice.LabelRegex)
              if(labels)
                if(labels.length)
                    labels = labels[0].match(/[A-z0-9\(\)\/,]+/g,'');
              console.log(labels)
              var scopeData = [];
              if(scopes) if(scopes.length){
                var sampleStep = 1;
                if(scopes.length > 1000)
                    sampleStep = Math.round(scopes.length/1000);
                for(var s=0;s<scopes.length;s=s+sampleStep){
                    var e = scopes[s].split("\t");
                    if(e)
                        if(e.length){
                            if(e.length == 4)
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:"Output"})
                            else if(e.length == 5){
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:"Output"})
                                scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[3]),c:"Input"})
                            }else if(e.length > 5 && labels.length == (e.length-2)){
                                for(var i=2;i<(e.length-2);i++)
                                    scopeData.push({x:parseFloat(e[1]),y:parseFloat(e[2]),c:(i-2)})
                            }
                        }
                }
            }
            if(scopeData.length)
                callback(scopeData)
            else
                errorFunction(rawData)
            });
        });
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
                    for(var i=0;i<scopeData.length;i++)
                        scopeData[i].x = Math.log10(scopeData[i].x);
                    graph("Circuit Output",scopeData,"Log(Frequency)","Voltage",callback,errorFunction);
                }else if(netlist.includes("ac lin"))
                    graph("Circuit Output",scopeData,"Frequency","Voltage",callback,errorFunction);
                
            }
        }
        this.SpiceSimulate(netlist,SpiceCallback,errorFunction)
    }
}

module.exports = Spice;