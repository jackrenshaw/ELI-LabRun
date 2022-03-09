const axios = require('axios')

var Tokens = {};

var Actions = [{
  "Name":"0. Familiarisation",
  "Parts":[{
    "Name":"0. Source Testing",
    "Sections":[{
      "Name":"1. Sine",
      "Pre":[{
        "Name":"Turn on Signal Generator",
        "func":function(value,callback,errorCallback){
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
      "Name":"1.1 1kHz Gain",
      "Pre":[{
        "Name":"Turn on Signal Generator"
      }],
      "Post":[{
        "Name":"Set Ri and Rf for Unity Inverting Gain, and set the Signal Generator to produce 1kHz at 0.1V",
        "func":function(value,callback,errorCallback){
          axios
          .post('https://prod-09.australiasoutheast.logic.azure.com:443/workflows/6cdde2e230cd439ca8cc84e502cb255c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YhYB_jQ0hdf6LKQ9vyJH0sgTU4A9GKrQS_tJCuParLA',{})
          .then(res => {
            callback(res.data);
          })
          .catch(error => {
            errorCallback(error)
          })
        }
      }]
    }]
  }] 
}]

module.exports.Actions = Actions;
module.exports.Tokens = Tokens