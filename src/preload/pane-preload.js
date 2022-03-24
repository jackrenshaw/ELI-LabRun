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
      var output = [];
      $(".switches li").each(function(){
        if($(this).data("output-type") == 'digital'){
          var value = false;
          if($(this).find("input").attr("checked"))
            value = true;
          output.push({
            "type":'digital',
            "value":value
          })
        }else if($(this).data("output-type") == 'analog'){
          output.push({
            "type":'analog',
            "value":$(this).find("input").val()
          })
        }
      })
      ipcRenderer.send('implement',{token:'password',output:output})
    })
  }
}