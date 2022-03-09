const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('set-title', title),
  login: (form) => ipcRenderer.send('login',form),
  getCompletions: (page) => ipcRenderer.send('getCompletions',page),
  startup: () => ipcRenderer.send('startup','begin')
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    ipcRenderer.on('startup-reply', (_event, arg) => {
      $(".container center").append(arg);
    });
    $("a.focus-lab").click(function(){
      console.log($(this));
      console.log($(this).data('lab'));
      console.log($(this).data('part'));
      $("section.lab").addClass("is-hidden");
      $("section.lab-actions[data-lab='"+$(this).data("lab")+"'][data-part='"+$(this).data("part")+"']").removeClass("is-hidden");
    })
    $("a.open-lab").click(function(){
      console.log($(this));
      console.log($(this).data('lab'));
      console.log($(this).data('part'));
      ipcRenderer.send('openLab',{lab:$(this).data("lab"),part:$(this).data("part"),section:$(this).data("section")})
      ipcRenderer.on('openLab-reply', (_event, arg) => {
        console.log(arg)
      });
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
        if(arg == 'success'){
          $("#login-modal").removeClass("is-active");
        }if(arg == 'error')
          $("#login-form p.feedback").html("Login Failed!")
      })
      ipcRenderer.on('completion-reply', (_event, arg) => {
        console.log(arg);
      })
    });
  }
}