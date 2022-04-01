var fs = require("fs");
var path = require("path");
var functions = require("./functions");
var Spice = require("./spice");

var Labs = {
    Labs:[],
    Simulations:[],
    StudentView: function(){
        return JSON.parse(JSON.stringify(this.Labs).replace(/"Solution":"[^"]+"/g,'"Solution":""'));
    },
    getSaved: function(lab,part){
        console.log(lab);
        console.log(part);
        const labs = fs.readdirSync("save");
        console.log(labs);
        for(var s of labs)
            if(s == lab){
                const parts = fs.readdirSync("save/"+s);
                console.log(parts);
                for(var p of parts)
                    if(p == part){
                        return fs.readdirSync("save/"+s+"/"+p);
                    }

            }
    },
    setLabs: async function(inp,verbose){
        verbose("Parsing Lab Files")
        Labs.Labs = [];
        var labs = null
        if(fs.lstatSync(inp).isDirectory())
            labs = fs.readdirSync(inp);
        else if(fs.lstatSync(inp).isFile() && inp.includes('.json'))
            labs = JSON.parse(fs.readFileSync(inp));
        if(labs) for(var l of labs) if(l.substring(0,1) != "." && fs.lstatSync(inp+"/"+l).isDirectory()){
            verbose(l);
            var Lab = {Name:l,Settings:{Header:"",Spiel:"",Instructions:""},Parts:[]}
            if(fs.existsSync(inp+"/"+l+"/settings.json"))
                Lab.Settings = JSON.parse(fs.readFileSync(inp+"/"+l+"/settings.json"));
            const parts = fs.readdirSync(inp+"/"+l);
            for(var p of parts) if(p.substring(0,1) != "." && p != "Framework" && fs.lstatSync(inp+"/"+l+"/"+p).isDirectory()){
                var Part = {Name:p,Sections:[],Implementations:[],Alts:[],Settings:{Header:"",Spiel:"",Instructions:""},Framework:null,"Questions":null,"Manual":null}
                if(fs.existsSync(inp+"/"+l+"/"+p+"/settings.json"))
                    Part.Settings = JSON.parse(fs.readFileSync(inp+"/"+l+"/"+p+"/settings.json"));
                const FrameworkFile = inp+"/"+l+"/"+p+"/Framework.html";
                if(fs.existsSync(FrameworkFile))
                    Part.Framework = fs.readFileSync(FrameworkFile,"utf-8");
                const QuestionFile = inp+"/"+l+"/"+p+"/Questions.json";
                if(fs.existsSync(QuestionFile))
                    Part.Questions = JSON.parse(fs.readFileSync(QuestionFile,"utf-8"));
                const ManualFile = inp+"/"+l+"/"+p+"/Manual.pdf";
                    if(fs.existsSync(ManualFile))
                        Part.Manual = ManualFile;
                const sections = fs.readdirSync(inp+"/"+l+"/"+p);
                console.log(sections);
                if(sections.includes("alt")) if(fs.lstatSync(inp+"/"+l+"/"+p+"/"+"alt").isDirectory()){
                    const alts = fs.readdirSync(inp+"/"+l+"/"+p+"/"+"alt");
                    for(var a of alts) 
                        if(fs.lstatSync(inp+"/"+l+"/"+p+"/"+"alt/"+a).isFile())
                            Part.Alts.push(Spice.SPICE_to_Components(fs.readFileSync(inp+"/"+l+"/"+p+"/"+"alt/"+a)));
                }
                for(var s of sections) if(s.substring(0,1) != "." && fs.lstatSync(inp+"/"+l+"/"+p+"/"+s).isFile() && /[\.\- A-z0-9]{1,20}.(cir)/g.test(s)){
                    const Section = {File:(inp+"/"+l+"/"+p+"/"+s),Name:s.replace(/.(cir|net)/g,''),Solution:"",Components:[],Simulation:[],SimulationImage:[],Models:[],Multimeter:[],Bench:{}}
                    Section.Solution = fs.readFileSync((inp+"/"+l+"/"+p+"/"+s),"utf-8").replace(/\x00/g, "");
                    var code = s.split(".");
                    code.pop();
                    Spice.ImageSimulate(
                        fs.readFileSync(inp+"/"+l+"/"+p+"/"+s,'utf-8'),
                        function(svg,data){
                            Section.Simulation.push(data);Section.SimulationImage.push(svg);
                        },
                        function(DC){
                            Section.Multimeter.push(DC);
                        },
                        console.log
                    );
                    Section.Components = Spice.SPICE_to_Components(Section.Solution);
                    Section.Bench = Spice.SPICE_to_Bench(Section.Solution);
                    console.log(Section.Bench);
                    Section.Instructions = Spice.SPICE_to_Instructions(Section.Solution);
                    Section.SimulationNotes = Spice.SPICE_to_SimulationNotes(Section.Solution);
                    Section.Output = Spice.SPICE_to_OUTPUT(Section.Solution);
                    Section.SimulationParams = Spice.SPICE_SimulationParameters(Section.Solution);
                    Section.Subcircuit = Spice.SPICE_Subcircuit(Section.Solution);
                    Section.Models = Spice.SPICE_Models(Section.Solution);
                    Part.Sections.push(Section);
                }

                for(var s of sections) if(fs.lstatSync(inp+"/"+l+"/"+p+"/"+s).isFile() && /[\.\- A-z0-9]{1,20}.(cir)/g.test(s)){
                    const Section = {};
                    Section.Solution = fs.readFileSync((inp+"/"+l+"/"+p+"/"+s),"utf-8").replace(/\x00/g, "");
                    Section.Output = Spice.SPICE_to_OUTPUT(Section.Solution);
                    Part.Implementations.push(Section);
                }
                console.log("iterating through sections to find alt nodes")
                for(var s1=0;s1<Part.Sections.length;s1++){
                    for(var c1=0;c1<Part.Sections[s1].Components.length;c1++){
                        for(var p1=0;p1<Part.Sections[s1].Components[c1].Ports.length;p1++){
                            for(var s2=0;s2<Part.Sections.length;s2++){
                                for(var c2=0;c2<Part.Sections[s2].Components.length;c2++){
                                    for(var p2=0;p2<Part.Sections[s2].Components[c2].Ports.length;p2++){
                                        if(Part.Sections[s1].Components[c1].Name == Part.Sections[s2].Components[c2].Name && Part.Sections[s1].Components[c1].Ports[p1].id == Part.Sections[s2].Components[c2].Ports[p2].id){
                                            if(Part.Sections[s1].Components[c1].Ports[p1].altnode)
                                                Part.Sections[s1].Components[c1].Ports[p1].altnode.push({sectionid:s2,node:Part.Sections[s2].Components[c2].Ports[p2].node})
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Lab.Parts.push(Part);
            }
            Labs.Labs.push(Lab)
        }
    }
}

module.exports = Labs