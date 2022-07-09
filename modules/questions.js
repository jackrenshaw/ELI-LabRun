const { PDFDocument } = require('pdf-lib');
var Questions = {
  checkSolution: function(question,solution){
    var allCorrect = true;
    for(var q=0;q<question.Questions.length;q++){
      if(solution.length > q && q.Answer && q.ErrorBar)
        if(q.Type == "Number")
          if(!Math.abs(solution[q]-q.Answer)<q.ErrorBar)
            allCorrect = false
        if(q.Type == "Table")
          if(q.Answer.length && solution[q].length)
            for(var i=0;i<q.Answer.length;i++)
              if(!Math.abs(solution[q]-q.Answer)<q.ErrorBar)
                allCorrect = false
    }
  },
  saveSolution: function(session,Solutions){

  },
  ProduceManual: async function(Part,Solutions,res){
    console.log("----------------------Producing PDF------------------");
    const pdfDoc = await PDFDocument.load(fs.readFileSync(Part.Manual))
    const pages = pdfDoc.getPages()
    if(Part.Questions)
      for(var u of Part.Questions) 
        for(var q of u.Questions)
          if(q.hasOwnProperty('PDF'))
            if(true){
              console.log("Question:");
              if(q.Type == "Number" || q.Type == "Word"){
                console.log("adding a text overlay")
                const thisPage = pages[q.PDF.page]
                thisPage.drawText(String(q.Answer), {
                  x: q.PDF.x,
                  y: q.PDF.y,
                  size: 14,
                });
              }else if(q.Type == "Table"){
                console.log("adding a table");
                for(var row=0;row<q.Answer.length;row++){
                  for(var col=0;col<q.Answer[row].length;col++)
                    if(row < q.PDF.length)
                      if(col < q.PDF[row].length){
                        console.log(q.PDF[row][col]);
                        console.log("adding text");
                        const thisPage = pages[q.PDF[row][col].page]
                        thisPage.drawText(String(q.Answer[row][col]), {
                          x: q.PDF[row][col].x,
                          y: q.PDF[row][col].y,
                          size: 14,
                        });
                      }
                }
              }               
          }
    const pdfData = await pdfDoc.save();
    tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {
      fs.writeFileSync(path,pdfData);
      var file = fs.createReadStream(path);
      var stat = fs.statSync(path);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline;filename=yolo.pdf');
      file.pipe(res);
    });
  }
}
module.exports = Questions