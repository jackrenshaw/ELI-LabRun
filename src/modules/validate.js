class Validate{
    constructor(){
        this.required = [
            //new RegExp("V§PS1( .{0,10}){2} (-?[0-9](.[0-9]{1,10})?){2}"),
            //new RegExp("V§PS2( .{0,10}){2} (-?[0-9](.[0-9]{1,10})?){2}"),
            //new RegExp("V§SIG( .{0,10}){2} (SINE|EXP|PWL)\(([0-9]{1,2}(\.[0-9]{1,10})? ?){1,10}"),
        ]
    }
    validateSPICE(netlist){
        //Exactly 3 power supplies
        //Every power supply required (PS1,PS2 and SigGen)
        //At least one node names OSC1+ or OSC1-
    }
    validateSubmission(submission,solution){
        //Both Power supplies must (exactly?) match
        //Signal Generator must (exactly?) match
        //Precisely the same number of components
        //Component values must be the same
        //Node checking
            //Check that ground is where it should be
                //Check that each component that is connected to ground in the solution is also connected to ground in the submission
            //Get the node names of the first,second power supply in the submission and solution
                //Replace in submission?
    }
}

var validate = new Validate();
module.exports = validate