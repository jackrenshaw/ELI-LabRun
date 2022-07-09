var Labs = require("./modules/labs")
const Spice = require("./modules/spice")
Spice.SpiceCommand = "ngspice"
var fs = require('fs')
Spice.ValidateCircuit(fs.readFileSync('labs/1. Operational Amplifier/Part A - Operation as Inverting amplifier/1.1 1kHz Gain.cir','utf-8'),
fs.readFileSync('labs/1. Operational Amplifier/Part A - Operation as Inverting amplifier/1.1 1kHz Gain.cir.dummy','utf-8'),null,null,console.log,console.log)