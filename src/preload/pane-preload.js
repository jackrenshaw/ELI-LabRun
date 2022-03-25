const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    $(document).add('*').off();
    ipcRenderer.addListener('implement-reply',function(arg){
      console.log(arg);
    })
    $("a[data-action='implement']").click(function(){
      var output = {
        "Digital":[],
        "Analog":[]
      };
      $("input[data-output-type='digital']").each(function(){
          var value = false;
          if($(this).attr("checked"))
            value = true;
          output.Digital.push(value);
      })
      $("input[data-output-type='analog']").each(function(){
        output.Analog.push($(this).val());
       })
      console.log(output);
      ipcRenderer.send('implement',{token:'password',output:output})
    })
  }
}