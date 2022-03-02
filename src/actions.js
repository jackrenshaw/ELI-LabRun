var Actions = [{
  "Name":"0. Familiarisation",
  "Parts":[{
    "Name":"0. Source Testing",
    "Sections":[{
      "Name":"1. Sine",
      "Pre":[{
        "Name":"Turn on Signal Generator",
        "func":function(callback,errorCallback){
          console.log('hello world')
        }
      }],
      "Post":[{
        "Name":"Turn off Signal Generator"
      }]
    }]
  }]
},{
  "Name":"1. Operational Amplifier",
  "Parts":[{
    "Name":"Part A - Operation as Inverting amplifier",
    "Sections":[{
      "Name":"1.1 kHz Gain",
      "Pre":[{
        "Name":"Turn on Signal Generator"
      }],
      "Post":[{
        "Name":"Turn off Signal Generator"
      }]
    }]
  }] 
}]
module.exports = Actions;