var Labs = require("./modules/labs")
const Spice = require("./modules/spice")
Spice.SpiceCommand = "ngspice"
Labs.setLabs("src/labs")
var fs = require('fs')
Spice.ValidateCircuit(fs.readFileSync("src/labs/1. Operational Amplifier/Part A - Operation as Inverting amplifier/1.1 1kHz Gain.dummy.cir","utf8"),fs.readFileSync("src/labs/1. Operational Amplifier/Part A - Operation as Inverting amplifier/1.1 1kHz Gain.cir","utf8"),null,null,console.log,console.log)