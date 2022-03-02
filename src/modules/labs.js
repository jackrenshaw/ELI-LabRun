var fs = require("fs");
var path = require("path");
var functions = require("./functions");
var config = require("../conf");
var Spice = require("./spice");

var Labs = {
    Labs:[],
    Simulations:[],
    StudentView: function(){
        return JSON.parse(JSON.stringify(this.Labs).replace(/"Solution":"[^"]+"/g,'"Solution":""'));
    },
    setLabs: function(dir){
        const labs = fs.readdirSync(dir);
        for(var l of labs) if(l.substring(0,1) != "." && fs.lstatSync(dir+"/"+l).isDirectory()){
            var Lab = {Name:l,Settings:{Header:"",Spiel:"",Instructions:""},Parts:[]}
            if(fs.existsSync(dir+"/"+l+"/settings.json"))
                Lab.Settings = JSON.parse(fs.readFileSync(dir+"/"+l+"/settings.json"));
            const parts = fs.readdirSync(dir+"/"+l);
            for(var p of parts) if(p.substring(0,1) != "." && p != "Framework" && fs.lstatSync(dir+"/"+l+"/"+p).isDirectory()){
                var Part = {Name:p,Sections:[],Settings:{Header:"",Spiel:"",Instructions:""},Framework:null,"Questions":null,"Manual":null}
                if(fs.existsSync(dir+"/"+l+"/"+p+"/settings.json"))
                    Part.Settings = JSON.parse(fs.readFileSync(dir+"/"+l+"/"+p+"/settings.json"));
                const FrameworkFile = dir+"/"+l+"/"+p+"/Framework.html";
                if(fs.existsSync(FrameworkFile))
                    Part.Framework = fs.readFileSync(FrameworkFile,"utf-8");
                const QuestionFile = dir+"/"+l+"/"+p+"/Questions.json";
                if(fs.existsSync(QuestionFile))
                    Part.Questions = JSON.parse(fs.readFileSync(QuestionFile,"utf-8"));
                const ManualFile = dir+"/"+l+"/"+p+"/Manual.pdf";
                    if(fs.existsSync(ManualFile))
                        Part.Manual = ManualFile;
                const sections = fs.readdirSync(dir+"/"+l+"/"+p)
                for(var s of sections) if(s.substring(0,1) != "." && fs.lstatSync(dir+"/"+l+"/"+p+"/"+s).isFile() && /[. A-z0-9]{1,20}.(net|cir)/g.test(s)){
                    const Section = {File:(dir+"/"+l+"/"+p+"/"+s),Name:s.replace(/.(cir|net)/g,''),Solution:"",Components:[],Simulation:[],SimulationImage:[]}
                    Section.Solution = fs.readFileSync((dir+"/"+l+"/"+p+"/"+s),"utf-8").replace(/\x00/g, "");
                    var code = s.split(".");
                    code.pop();
                    Spice.ImageSimulate(fs.readFileSync(dir+"/"+l+"/"+p+"/"+s,'utf-8'),function(svg,data){Section.Simulation.push(data);Section.SimulationImage.push(svg);},console.log);
                    Section.Components = Spice.SPICE_to_Components(Section.Solution);
                    Section.Instructions = Spice.SPICE_to_Instructions(Section.Solution);
                    Section.SimulationNotes = Spice.SPICE_to_SimulationNotes(Section.Solution);
                    Section.ActionFunction = Spice.SPICE_to_Action_Function(Section.Solution);
                    Section.SimulationParams = Spice.SPICE_SimulationParameters(Section.Solution);
                    Section.Subcircuit = Spice.SPICE_Subcircuit(Section.Solution);
                    Part.Sections.push(Section);
                }
                Lab.Parts.push(Part);
            }
            Labs.Labs.push(Lab)
        }
    }
}

module.exports = Labs