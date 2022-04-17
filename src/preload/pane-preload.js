const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    $(document).add('*').off();
    ipcRenderer.addListener('implement-reply',function(_event, arg){
      console.log(arg);
    })
    ipcRenderer.addListener('implement-error',function(_event, arg){
      console.log(arg);
      $("body #Notifications").append(`<div class="notification is-danger  is-light">
      <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>Error Implementing Switches</strong><br>
There was an error implementing those changes. Please report this to your lab demonstrator<br>
<strong>Details:</strong>`+arg+`</div>`);
    })
    ipcRenderer.on('simulatedata-reply', (_event, arg) => {
      console.log("Simulation Response:");
      console.log(arg)
    })
    ipcRenderer.on('rawdata-reply', (_event, arg) => {
      console.log("Raw Data:");
      console.log(arg)
    })
    $("a[data-action='implement']").click(function(){
      var output = {
        "Digital":[[0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0]],
        "Analog":[0.0,0.0]
      };
      $("input[data-output-type='digital']").each(function(){
          var value = false;
          if($(this).attr("checked") && ($(this).data("digital-port") || $(this).data("digital-port") == 0) && ($(this).data("digital-line") || $(this).data("digital-line") == 0))
            output.Digital[$(this).data("digital-port")][$(this).data("digital-line")] = 1;
      })
      $("input[data-output-type='analog']").each(function(){
        output.Analog.push($(this).val());
       })
      console.log(output);
      ipcRenderer.send('implement',{token:'password',output:output})
    })
  }
}