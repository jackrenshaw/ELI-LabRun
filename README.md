# ELI-LabRun
## Requirements
ELI LabRun is a Node.JS program that allows students to create analog circuits, simulate the created circuits and implement those circuit on a Lab PCB. The design is cross-platform. The primary system requirement is the ability to create a local webserver and to run Node.JS, as well as the ability to call executables from the shell.
## Specification
The Specificaiton is the input to the program. The specification exists in a folder called Specification, which contains a file called "Components.json" (detailed below)
## Component Specification
The component specification exists within the specification folder as a .JSON file. This file is an object, where each child property corresponds to a component. The purpose of the component specification is to relate a SPICE component to the visual representation. The visual representation of a component is an HTML object with style attributes and data attributes, generated at runtime
## Customisation Options
One option for customisation is the ability to use a different DAQ/GPIO Device to control the Lab PCB. Altering the DAQ/GPIO require the compilation of a new executable that interfaces with the DAQ/GPIO device, and the alteration of the "actions" module, which is the API for the executable. The second option is to use a GPIO library which can act as the API
## Runtime
At runtime, the specification is parsed and translated into a usable object and into a compiled HTML file which is embedded into the lab view via EJS. These HTML 

## Modules
### Actions
The actions module is used to translate a output instruction (i.e. change this switch to this value) into a format compatible with the program compiled to interface with the NIDAQ USB 6008, and to call that program via a shell command. 
### Check
The check module is used on the client-side to validate the circuit
### Graph
The graph module is used on the server-side to produce an X-Y line graph of either 1 or 2 datasets. This is used to produce oscilloscope readings
### Questions
The questions module is not currently used. It is the very basic outline of a question set for ELEC2133, so that the lab manual can be intergrated with the program
### Specification
The specification module is responsible for transforming the specification folder into an object and fileset used to produce the visual representation for the labs 
### Spice
The SPICE module is the module responsible for translating a SPICE file into a set of components, translated a visual representation into a SPICE file (via the client property which is a class), translating SPICE simulation results into a data type compatible with graphing
### UI
The UI module is responsible for controlling aspects of the uer interface, including the creation of wires, dragging of components, setting of component values.
