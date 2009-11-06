// $Id$

Drupal.behaviors.chatroomUserWidget = function(context) {
  // Add the event to the user form to add a user to the list of allowed users.
  $('#edit-add-user').keyup(function (e) {
    e.preventDefault();
    e.stopPropagation();
    var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
    if (key == 13) {
      var userName = $('#edit-add-user').val();
      if (userName) {
        var allowedUsers = Drupal.settings.chatroomChatForm.allowedUsers;
        var currentUserCount = allowedUsers.length;
        $('#edit-add-user').val('');
        for (var i = 0; i < currentUserCount; i++) {
          // If this user is already on our list, just bail out.
          if (allowedUsers[i].name == userName) {
            return false;
          }
        }
        Drupal.chatroom.userAdd(userName);
      }
    }
    return false;
  });

  // Add events to the user list to remove them.
  $('.chatroom-remove-user').click(function (e) {
    var bits = e.target.id.match(/chatroom_allowed_user_([\d]+)$/);
    if (bits) {
      Drupal.chatroom.userRemove(bits[1]);
    }
  });
}

Drupal.chatroom.userAdd = function(userName) {
  $.ajax({
    type: 'POST',
    url: Drupal.settings.basePath + Drupal.settings.chatroomChatForm.userAddPath + '/' + Drupal.settings.chatroom.chatId,
    dataType: 'json',
    success: Drupal.chatroom.userAddHandler,
    data: { user_name: userName } 
  });
};

Drupal.chatroom.userRemove = function(uid) {
  $.ajax({
    type: 'POST',
    url: Drupal.settings.basePath + Drupal.settings.chatroomChatForm.userRemovePath + '/' + Drupal.settings.chatroom.chatId,
    dataType: 'json',
    success: Drupal.chatroom.userRemoveHandler,
    data: { uid: uid } 
  });
};

Drupal.chatroom.userRemoveHandler = function(response, responseStatus) {
  if (response.data.userRemoved) {
    $('#chatroom_allowed_user_li_' + response.data.userRemoved).remove();
  }
};

Drupal.chatroom.userAddHandler = function(response, responseStatus) {
  var li = document.createElement('li'); 
  li.id = 'chatroom_allowed_user_li_' + response.data.uid;
  li.innerHTML = response.data.userLinkHtml;
  document.getElementById('chatroom_allowed_users_list').appendChild(li);
  // Add events to the user list to remove them.
  $('#chatroom_allowed_user_' + response.data.uid).click(function (e) {
    var bits = e.target.id.match(/chatroom_allowed_user_([\d]+)$/);
    if (bits) {
      Drupal.chatroom.userRemove(bits[1]);
    }
  });
};

Drupal.behaviors.chatroomInviteWidget = function(context) {
  // Add the event to the user form to add a user to the list of allowed users.
  $('#edit-invite-user').keyup(function (e) {
    e.preventDefault();
    e.stopPropagation();
    var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
    if (key == 13) {
      var userName = $('#edit-invite-user').val();
      if (userName) {
        $('#edit-invite-user').val('');
        Drupal.chatroom.userInvite(userName);
      }
    }
    return false;
  });
}

Drupal.chatroom.userInvite = function(userName) {
  $.ajax({
    type: 'POST',
    url: Drupal.settings.basePath + Drupal.settings.chatroomChatForm.userInvitePath + '/' + Drupal.settings.chatroom.chatId,
    dataType: 'json',
    success: Drupal.chatroom.userInviteHandler,
    data: { user_name: userName } 
  });
};

Drupal.chatroom.userInviteHandler = function(response, responseStatus) {
  if (response.data.userInvited) {
    // Write a message to the chat window.
    $('#chatroom-board').append(response.data.userInvited);
    var boardOffset = $('#chatroom-board').offset().top;
    var targetOffset = $('div.new-message:last').offset().top;
    var scrollAmount = targetOffset - boardOffset;
    $('#chatroom-board').animate({scrollTop: '+='+ scrollAmount +'px'}, 500);
    $('.new-message').removeClass('new-message');
    if (Drupal.settings.chatroom.hasFocus == false) {
      Drupal.settings.chatroom.newMsg = newMessage;
      clearInterval(Drupal.settings.chatroom.warnInterval);
      Drupal.settings.chatroom.warnInterval = setInterval("Drupal.chatroom.warnNewMsgLoop()", 1500);
    }
  }
};

// vi:ai:expandtab:sw=2 ts=2 

