var vega = require('vega')
var fs = require('fs');
const { render } = require('pug');
const { off } = require('process');

//Function ensures that the data being passed to VEGA is valid (i.e. contains an X,Y coordinate and label (C))
function validateData(data) {
  var valid = false;
  if (data) if (data.length) {
    valid = true;
    for (var d of data)
      if (d)
        if (!d.hasOwnProperty("x") || !d.hasOwnProperty("y") || !d.hasOwnProperty("c"))
          valid = false;
        else void (0);
      else valid = false;
  }
  return valid;
}

//Function is used to downsample the signal in the case of a very long signal with high resolution
pickn = function (a, n, sigs) {
  var p = Math.floor(a.length / n)
  return a.slice(0, p * n).filter(function (_, i) {
    if (sigs == 1)
      return 0 == i % p
    else if (sigs == 2)
      return 0 == i % p || 1 == i % p
  })
}

/*Function MakeSVG
------------------
INPUTS: 
- Graph Title
- Data (as an array of objects which each contain X,Y,C properties)
- Label for X axis
- Label for Y Axis
- Callback Function (which takes the image as a parameter)
- Error Function (which takes the error as a parameter)
-------------------------------------------
Function uses the VEGA library to produce a simple 2D plot of the signals produced. 
There are two major transformations made:
1. The Y axis is set to enclose the entire function (by finding the maximum and minimum function values), plus a 25% margin
2. The function is downsampled if the 
3. Numbers are rounded to 3 sig figures
*/
function makeSVG(title, data, xLabel, yLabel, callback, errorFunction) {
  if (validateData(data)) {
    var sampledX = pickn(data, 10, 1);
    var scale = [Math.min.apply(Math, data.map(function (o) { return o.y; })), Math.max.apply(Math, data.map(function (o) { return o.y; })) * 1.25];
    for (var i = 0; i < sampledX.length; i++)
      sampledX[i].x = Math.round(sampledX[i].x * 1000) / 1000;
    var spec = {
      "$schema": "https://vega.github.io/schema/vega/v5.json",
      "title": title,
      "description": "A basic line chart example.",
      "width": 700,
      "height": 500,
      "padding": 5,
      "config": {
        "axis": {
          "grid": false,
          "gridColor": "#dedede",
          "tickCount": 15
        }
      },
      "signals": [
        {
          "name": "interpolate",
          "value": "linear",
          "bind": {
            "input": "select",
            "options": [
              "basis",
              "cardinal",
              "catmull-rom",
              "linear",
              "monotone",
              "natural",
              "step",
              "step-after",
              "step-before"
            ]
          }
        }
      ],

      "data": [
        {
          "name": "table",
          "values": data
        }, {
          "name": "samplex",
          "values": sampledX
        }
      ],

      "scales": [
        {
          "name": "x",
          "type": "point",
          "range": "width",
          "domain": { "data": "table", "field": "x" },
          "nice": true
        },
        {
          "name": "x2",
          "type": "point",
          "range": "width",
          "domain": { "data": "samplex", "field": "x" },
          "nice": true
        },
        {
          "name": "y",
          "type": "linear",
          "range": "height",
          "nice": true,
          "zero": true,
          "domain": scale
        },
        {
          "name": "color",
          "type": "ordinal",
          "range": "category",
          "domain": { "data": "table", "field": "c" }
        }
      ],

      "axes": [
        { "orient": "bottom", "scale": "x", "labels": false, "ticks": false, "title": "" },
        { "orient": "bottom", "scale": "x2", "labels": true, "ticks": true, "title": xLabel },
        { "orient": "left", "scale": "y", "labels": true, "title": yLabel }
      ],

      "marks": [
        {
          "type": "group",
          "from": {
            "facet": {
              "name": "series",
              "data": "table",
              "groupby": "c"
            }
          },
          "marks": [
            {
              "type": "line",
              "from": { "data": "series" },
              "encode": {
                "enter": {
                  "x": { "scale": "x", "field": "x" },
                  "y": { "scale": "y", "field": "y" },
                  "stroke": { "scale": "color", "field": "c" },
                  "strokeWidth": { "value": 2 }
                },
                "update": {
                  "interpolate": { "signal": "interpolate" },
                  "strokeOpacity": { "value": 1 }
                },
                "hover": {
                  "strokeOpacity": { "value": 0.5 }
                }
              }
            }
          ]
        }
      ],
      "legends": [
        {
          "tickCount": 15,
          "fill": "color",
          "orient": "none",
          "legendX": 550,
          "legendY": 0,
          "title": "Signals",
          "encode": {
            "title": {
              "update": {
                "fontSize": { "value": 14 }
              }
            },
            "labels": {
              "interactive": true,
              "update": {
                "fontSize": { "value": 12 },
                "fill": { "value": "black" }
              },
              "hover": {
                "fill": { "value": "firebrick" }
              }
            },
            "symbols": {
              "update": {
                "stroke": { "value": "transparent" }
              }
            },
            "legend": {
              "update": {
                "stroke": { "value": "#ccc" },
                "strokeWidth": { "value": 1.5 }
              }
            }
          }
        }
      ]
    }
    var view = new vega.View(vega.parse(spec), { renderer: 'none' });
    view.toSVG()
      .then(function (svg) {
        callback(svg, data);
      })
      .catch(function (err) { errorFunction(err) });
  } else {
    errorFunction("Invalid Data");
    console.log(data)
  }
}

module.exports = makeSVG