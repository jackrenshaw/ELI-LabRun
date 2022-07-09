var express = require('express');
var fs = require("fs");
var crypto = require('crypto');
var router = express.Router();

var builds = {};
let Courses = [];
let HashMapSections = {};

function parseCourses(inp){
  const DIRSLASH = "/";
  var cfolders = [];
  let Courses = [];
  if (fs.existsSync(inp))
  if (fs.lstatSync(inp).isDirectory())
    clist = fs.readdirSync(inp);
  if (clist)
    for (var c of clist)
        if (fs.lstatSync(inp + DIRSLASH + c).isDirectory() && c.substring(0, 1) != ".")
          cfolders.push({ course: c, labs: fs.readdirSync(inp + DIRSLASH + c) })
  if (cfolders)
    for (var c of cfolders) {
      var Course = {Name:c.course,Labs:[]}
      var labs = c.labs;
      let CourseLabs = [];
      if (labs)
        for (var l of labs)
          if (l.substring(0, 1) != "." && fs.lstatSync(inp + DIRSLASH + c.course + DIRSLASH + l).isDirectory()) {
            var Lab = { Name: l, Parts: [] }
            const parts = fs.readdirSync(inp + DIRSLASH + c.course + DIRSLASH + l);
            for (var p of parts)
            if (p.substring(0, 1) != "." && p != "Framework" && fs.lstatSync(inp + DIRSLASH + c.course + DIRSLASH + l + DIRSLASH + p).isDirectory()) {
              var sections = fs.readdirSync(inp + DIRSLASH + c.course + DIRSLASH + l + DIRSLASH + p)
              var Part = { 
                Name: p, 
                Sections: []
              };
              for(var s of sections){
                let Section = {
                  hash:crypto.createHash('md5').update(inp + DIRSLASH + c.course + DIRSLASH + l + DIRSLASH + p + DIRSLASH + s).digest('hex'),
                  file:(inp + DIRSLASH + c.course + DIRSLASH + l + DIRSLASH + p + DIRSLASH + s)
                };
                Part.Sections.push(Section);
                HashMapSections[Section.hash] = Section.file;
              }
              Lab.Parts.push(Part);
            }
            Course.Labs.push(Lab);
          }
        Courses.push(Course)
      }
  return Courses;
}

Courses = parseCourses("HTML");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect("/b/"+new Date().getTime())
});

router.get('/b/:c', function(req, res, next) {
  let build = {export:null};
  let buildset = false;
  if(builds.hasOwnProperty(req.params.c)){
    build = builds[req.params.c];
    buildset = true;
  }if(req.query.f){
    console.log(req.query.f)
  }
  res.render('build', { 
    preload:null,
    code:req.params.c,
    type:"build",
    build:build,
    buildset:buildset,
    title: 'Express',
    Courses:Courses,
    page:null 
  });
});

router.get("/api/:c",function(req,res,next){
  console.log("Recieved downsync request");
  if(builds.hasOwnProperty(req.params.c))
    res.send(JSON.stringify(builds[req.params.c]))
  else
    res.status(400).send({});
})

router.post("/api/:c",function(req,res,next){
  console.log("Recieved upsync request");
  builds[req.params.c] = JSON.parse(req.body.build);
  res.status(200).send(JSON.stringify(builds[req.params.c]));
})

module.exports = router;
