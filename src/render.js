if (document.readyState == "complete") {
$(document).ready(function(){
  $(".show-actions").click(function(){
    console.log("hello world");
  })
  var pullLabs = function(token,callback){
    $.ajax({
      type: "POST",
      url: "https://unsw-eli.herokuapp.com/l/",
      data: {token:token}
    }).done(function(data){
      console.log("Success")
      $("body").append(data)
    }).fail(function(data){
      console.log("Fail")
      $("body").append(data)
    })
  }
  var pullActions = function(token,callback){
    $.ajax({
      type: "POST",
      url: "https://unsw-eli.herokuapp.com/e/",
      data: {token:token}
    }).done(function(data){
      $("body").append(data)
    }).fail(function(data){
      $("body").append(data)
    })
  }
  var auth_token = null;
  $("#login-modal").addClass("is-active");
  // this is the id of the form
$("#login-form").submit(function(e) {
  e.preventDefault();
  var form = $(this);
  ipc.send("login",form.serialize())
  var actionUrl = form.attr('action');
  console.log(form.serialize())
  $.ajax({
      type: "POST",
      url: actionUrl,
      data: form.serialize()
  }).done(function(data){
    auth_token = data;
    console.log(auth_token);
    $("#login-modal").removeClass("is-active");
    pullActions(auth_token);
    pullLabs(auth_token);
    //window.open('https://unsw-eli.herokuapp.com/auth/token/'+auth_token)
  }).fail(function(data){
    $("#login-form p.login-feedback").html("Login Failed!")
  });
});
})
}