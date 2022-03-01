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
      console.log("Connecting with the IPC")
      console.log($(this).data());
      ipcRenderer.send('getCompletions',{lab:$(this).data("lab"),part:$(this).data("part")})
      ipcRenderer.on('completion-reply', (_event, arg) => {
        console.log(arg);
      })
    })
    $("#login-modal").addClass("is-active");
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