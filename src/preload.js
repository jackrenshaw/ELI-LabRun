const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('set-title', title),
  login: (form) => ipcRenderer.send('login',form),
  getCompletions: (page) => ipcRenderer.send('getCompletions',page)
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    $("a.listen-ipc").click(function(){
      setInterval(function(){
        console.log("Getting Completions");
        ipcRenderer.send('getCompletions',{lab:$(this).data("lab"),part:$(this).data("part")})
      },5000);
      ipcRenderer.on('completion-reply', (_event, arg) => {
        console.log(arg)
        if(arg.hasOwnProperty('token'))
          $("#confirm-modal").addClass("is-active");
          $("#confirm-modal").find("button.is-success").data("token",arg.token)
      })
    })
    $("#confirm-modal button.is-success").click(function(){
      console.log("enactCircuit");
      ipcRenderer.send('enactCircuit',{token:$(this).data('token')})
      ipcRenderer.on('enact-reply', (_event, arg) => {
        console.log(arg)
      })
    })
    $("#login-form").submit(function(e) {
      e.preventDefault();
      var form = $(this);
      ipcRenderer.send('login',form.serialize())
      ipcRenderer.on('login-reply', (_event, arg) => {
        console.log(arg);
        if(arg == 'success')
          $("#login-modal").removeClass("is-active");
        if(arg == 'error')
          $("#login-form p.feedback").html("Login Failed!")
      })
      ipcRenderer.on('completion-reply', (_event, arg) => {
        console.log(arg);
      })
    });
  }
}