const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('set-title', title),
  login: (form) => ipcRenderer.send('login',form),
  getCompletions: (page) => ipcRenderer.send('getCompletions',page),
  startup: () => ipcRenderer.send('startup','begin'),
  setDirectory: (directory) => ipcRenderer('set-directory',directory)
})

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    const $ = require('jquery');
    $(document).add('*').off();
    ipcRenderer.on('startup-reply', (_event, arg) => {
      $(".container center").append(arg);
    });
    ipcRenderer.on('startup-error', (_event, arg) => {
      console.log("There was a startup error");
      $(".container center").append(arg);
    });
    ipcRenderer.on('openLab-reply', (_event, arg) => {
      console.log(arg)
    });
    ipcRenderer.on('openLab-error', (_event, arg) => {
      $("body #Notifications").append(`<div class="notification is-danger  is-light">
      <button class="delete" onclick='$(this).parent().remove()'></button>
<strong>Error Opening Lab</strong><br>
There was an error the requested Laboratory. This error likely relates to setting the initial hardware conditions. Please report this to your lab demonstrator<br>
<strong>Details:</strong>`+arg+`</div>`);
      console.log("Error Opening Lab");
      console.log(arg)
    });
    ipcRenderer.on('openPane-reply', (_event, arg) => {
      console.log(arg)
    });
    ipcRenderer.on('completion-reply', (_event, arg) => {
      console.log(arg);
    })
    $("a.focus-lab").click(function(){
      console.log($(this));
      console.log($(this).data('lab'));
      console.log($(this).data('part'));
      //$("section.lab").addClass("is-hidden");
      //$("section.lab-actions[data-lab='"+$(this).data("lab")+"'][data-part='"+$(this).data("part")+"']").removeClass("is-hidden");
    })
    $("a[data-action='open-lab']").click(function(){
      ipcRenderer.send('openLab',{page:{lab:$(this).data("lab"),part:$(this).data("part"),section:$(this).data("section")},preload:null})
    })
    $("a[data-action='open-pane']").click(function(){
      ipcRenderer.send('openPane',{page:{lab:$(this).data("lab"),part:$(this).data("part"),section:$(this).data("section")},preload:null})
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
    });
  }
}