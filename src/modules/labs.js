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
                        if(fs.lstatSync(inp+"/"+l+"/"+p+"/"+"alt/"+a).isFile()){
                            const Solution = fs.readFileSync(inp+"/"+l+"/"+p+"/"+"alt/"+a,"utf-8").replace(/\x00/g, "");
                            Part.Alts.push({
                                Name:a,
                                Components:Spice.SPICE_to_Components(Solution),
                                Bench:Spice.SPICE_to_Bench(Solution),
                                Output:Spice.SPICE_to_OUTPUT(Solution)
                            });
                        }
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
                Lab.Parts.push(Part);
            }
            Labs.Labs.push(Lab)
        }
    }
}

module.exports = Labs