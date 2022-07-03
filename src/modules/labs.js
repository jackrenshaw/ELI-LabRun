var fs = require("fs");
var path = require("path");
var functions = require("./functions");
var Spice = require("./spice");

var Labs = {
    DIRSLASH: "\\",
    Creative: true,
    Procedural: false,
    Direct: false,
    Courses: [],
    Simulations: [],
    getSaved: function (SAVEDIR, lab, part) {
        const labs = fs.readdirSync(SAVEDIR + this.DIRSLASH);
        for (var s of labs)
            if (s == lab) {
                const parts = fs.readdirSync(SAVEDIR + this.DIRSLASH + s);
                for (var p of parts)
                    if (p == part) {
                        return fs.readdirSync(SAVEDIR + this.DIRSLASH + s + this.DIRSLASH + p);
                    }

            }
    },
    setLabs: async function (inp, verbose, error) {
        verbose("Parsing Lab Files")
        Labs.Courses = [];
        var clist = null;
        var courses = [];
        var labs = [];
        if (fs.existsSync(inp))
            if (fs.lstatSync(inp).isDirectory())
                clist = fs.readdirSync(inp);
            else
                error("There was an issue opening the lab directory")
        else
            error("Lab Directory doesn't exist");
        console.log(clist);
        if (clist)
            for (var c of clist)
                if (fs.lstatSync(inp + this.DIRSLASH + c).isDirectory() && c.substring(0, 1) != ".")
                    courses.push({ course: c, labs: fs.readdirSync(inp + this.DIRSLASH + c) })
        console.log(courses);
        if (courses)
            for (var c of courses) {
                var labs = c.labs;
                let CourseLabs = [];
                if (labs)
                    for (var l of labs)
                        if (l.substring(0, 1) != "." && fs.lstatSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l).isDirectory()) {
                            verbose(l);
                            var Lab = { Name: l, Parts: [] }
                            const parts = fs.readdirSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l);
                            for (var p of parts)
                                if (p.substring(0, 1) != "." && p != "Framework" && fs.lstatSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p).isDirectory()) {
                                    var Part = { Name: p, Sections: [], Implementations: [], Alts: [], Settings: { Header: "", Spiel: "", Instructions: "" }, FrameworkFile: null, Framework: null, "Questions": null, "Manual": null }
                                    if (fs.existsSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + "settings.json"))
                                        Part.Settings = JSON.parse(fs.readFileSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + "settings.json"));
                                    Part.FrameworkFile = inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + "Framework.html";
                                    const QuestionFile = inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + "Questions.json";
                                    if (fs.existsSync(QuestionFile))
                                        Part.Questions = JSON.parse(fs.readFileSync(QuestionFile, "utf-8"));
                                    const ManualFile = inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + "Manual.pdf";
                                    if (fs.existsSync(ManualFile))
                                        Part.Manual = ManualFile;
                                    const Mapping = inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + "Mapping.txt";
                                    console.log("Checking for Mapping")
                                    if (fs.existsSync(Mapping)) {
                                        console.log("Mapping Exists")
                                        var MapArray = [new Array(8), new Array(8)];
                                        var mappingFile = fs.readFileSync(Mapping, "utf-8");
                                        var mappingLines = mappingFile.match(/[0-9]{2} = .+/g);
                                        console.log(parseInt(mappingLines[0].substring(1, 2)));
                                        console.log(parseInt(mappingLines[0].substring(0, 1)));
                                        for (var m of mappingLines)
                                            if (parseInt(m.substring(1, 2)) >= 0 && parseInt(m.substring(1, 2)) <= 7)
                                                if (m.substring(0, 1) == 0)
                                                    MapArray[0][parseInt(m.substring(1, 2))] = m.replace(/[0-9]{2} = /, "");
                                                else if (m.substring(0, 1) == 1)
                                                    MapArray[1][parseInt(m.substring(1, 2))] = m.replace(/[0-9]{2} = /, "");
                                        Part.Mapping = MapArray
                                        console.log(Part.Mapping)
                                    }
                                    const Nodes = inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + "Nodes.txt";
                                    if (fs.existsSync(Nodes))
                                        Part.Nodes = fs.readFileSync(Nodes, "utf-8");
                                    const sections = fs.readdirSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p);
                                    if (fs.existsSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + "HardwareMap.cir")) {
                                        const Map = fs.readFileSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + "HardwareMap.cir", "utf-8").replace(/\x00/g, "");
                                        const Names = Map.match(/\*\*\*.+\*\*\*/g);
                                        const Solutions = Map.split(/\*\*\*.+\*\*\*/g).slice(1);
                                        if (Names && Solutions)
                                            if (Names.length == Solutions.length)
                                                for (var a = 0; a < Solutions.length; a++)
                                                    Part.Alts.push({
                                                        Name: Names[a].replace(/\*/g, ''),
                                                        Circuit: Solutions[a],
                                                        Components: Spice.SPICE_to_Components(Solutions[a]),
                                                        Bench: Spice.SPICE_to_Bench(Solutions[a]),
                                                        Output: Spice.SPICE_to_OUTPUT(Solutions[a])
                                                    });
                                    }
                                    for (var s of sections)
                                        if (s.substring(0, 1) != "." && s.substring(0, 15) != "HardwareMap.cir" && fs.lstatSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + s).isFile() && /[\.\- A-z0-9]{1,20}.(cir)/g.test(s)) {
                                            const Section = { File: (inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + s), Name: s.replace(/.(cir|net)/g, ''), Solution: "", Components: [], Simulation: [], SimulationImage: [], Models: [], Multimeter: [], Bench: {} }
                                            Section.Solution = fs.readFileSync((inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + s), "utf-8").replace(/\x00/g, "");
                                            var code = s.split(".");
                                            code.pop();
                                            Spice.ImageSimulate(
                                                fs.readFileSync(inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + s, 'utf-8'),
                                                function (svg, data) {
                                                    Section.Simulation.push(data); Section.SimulationImage.push(svg);
                                                }, function (rawScopeData) { },
                                                function (DC) {
                                                    Section.Multimeter.push(DC);
                                                },
                                                console.log
                                            );
                                            Section.Components = Spice.SPICE_to_Components(Section.Solution, Part.Alts);
                                            Section.Bench = Spice.SPICE_to_Bench(Section.Solution, Part.Alts);
                                            Section.Instructions = Spice.SPICE_to_Instructions(Section.Solution);
                                            Section.SimulationNotes = Spice.SPICE_to_SimulationNotes(Section.Solution);
                                            Section.ImplementationNotes = Spice.SPICE_to_ImplementationNotes(Section.Solution);
                                            Section.Output = Spice.SPICE_to_OUTPUT(Section.Solution);
                                            Section.SimulationParams = Spice.SPICE_SimulationParameters(Section.Solution);
                                            Section.Subcircuit = Spice.SPICE_Subcircuit(Section.Solution);
                                            Section.Models = Spice.SPICE_Models(Section.Solution);
                                            Part.Sections.push(Section);
                                        }
                                    for (var s of sections)
                                        if (fs.lstatSync(inp + this.DIRSLASH + c.course +this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + s).isFile() && /[\.\- A-z0-9]{1,20}.(cir)/g.test(s)) {
                                            const Section = {};
                                            Section.Solution = fs.readFileSync((inp + this.DIRSLASH + c.course + this.DIRSLASH + l + this.DIRSLASH + p + this.DIRSLASH + s), "utf-8").replace(/\x00/g, "");
                                            Section.Output = Spice.SPICE_to_OUTPUT(Section.Solution);
                                            Part.Implementations.push(Section);
                                        }
                                    Lab.Parts.push(Part);
                                }
                            CourseLabs.push(Lab)
                        }
                    Labs.Courses.push({Name:c.course,Labs:CourseLabs});
            }
            console.log(Labs.Courses);
    }
}

module.exports = Labs