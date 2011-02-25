
Drupal.chatroom = Drupal.chatroom || {};
Drupal.chatroom.block = Drupal.chatroom.block || {};

/**
 * Add chatroom events handlers to the on-screen widgets.
 */
Drupal.chatroom.block.addEvents = function() {
  Drupal.chatroom.block.updates = setInterval("Drupal.chatroom.block.getUpdates()", Drupal.settings.chatroom.blockUpdateInterval);
  return;
}

/**
 * Process response to HTTP request.
 */
Drupal.chatroom.block.blockCallback = function(responseText) {
  if (responseText) {
    var response = eval('('+ responseText +')');
    if (typeof response == 'object') {
      if (response.chatList != undefined) {
        Drupal.chatroom.block.updateChats(response.chatList);
      }
      if (response.chatroomList != undefined) {
        Drupal.chatroom.block.updateChatrooms(response.chatroomList);
      }
      if (response.userList != undefined) {
        Drupal.chatroom.block.updateOnlineUsers(response.userList);
      }
    }
  }
}

/**
 * Update the on-line users block.
 */
Drupal.chatroom.block.updateOnlineUsers = function(users) {
  var userList = $('#chatroom-sitewide-online');
  if (userList.length > 0) {
    var userListUsers = $('li', userList); // Get the current user list.
    if (users.length == 0) {
      if (userListUsers.attr('id') != 'no_users') {
        var li = $('<li>');
        li.attr('id', 'no_users');
        li.css('fontStyle', 'italic');
        li.append(Drupal.settings.chatroom.usersMessage);
        userList.empty();
        userList.append(li);
      }
    }
    else {
      for (var i = 0; i < userListUsers.length; i++) { // Delete users not in the new user list.
        var listUser = $(userListUsers[i]);
        var deleteFlag = true;
        for (var j = 0; j < users.length; j++) {
          if (listUser.attr('id') == 'user-li-'+ users[j].uid) {
            deleteFlag = false;
            users.splice(j, 1);
            break;
          }
        }
        if (deleteFlag) {
          listUser.remove();
        }
      }
      for (var i = 0; i < users.length; i++) {
        var userInfo = $('<strong>');
        userInfo.append(users[i].user);
        var li = $('<li>');
        li.attr('id', 'user-li-'+ users[i].uid);
        li.append(userInfo);
        userList.append(li);
      }
    }
  }
}

/**
 * Update the active chats block.
 */
Drupal.chatroom.block.updateChats = function(chats) {
  var chatList = $('#chatroom-sitewide-chats');
  if (chatList.length > 0) {
    Drupal.settings.chatroom.chatTimestamp = chats.pop(); // Set timestamp for use in next update request.
    var chatListItems = $('li', chatList); // Get the current chat list.
    if (chats.length == 0) {
      if (chatListItems.attr('id') != 'chat_empty') {
        var li = $('<li>');
        li.attr('id', 'chat_empty');
        li.css('fontStyle', 'italic');
        li.append(Drupal.settings.chatroom.chatsMessage);
        chatList.empty();
        chatList.append(li);
      }
    }
    else {
      for (var i = 0; i < chatListItems.length; i++) { // Delete items not in the new chat list.
        var chatItem = $(chatListItems[i]);
        var deleteFlag = true;
        for (var j = 0; j < chats.length; j++) {
          if (chatItem.attr('id') == chats[j].chatListId) {
            deleteFlag = false;
            chats.splice(j, 1);
            break;
          }
        }
        if (deleteFlag) {
          chatItem.remove();
        }
      }
      for (var i = 0; i < chats.length; i++) {
        var chatLink = $('<a>');
        chatLink.append(chats[i].chatName);
        chatLink.attr('href', Drupal.settings.chatroom.chatBase + chats[i].ccid);
        var roomLink = $('<a>');
        roomLink.append(chats[i].roomName);
        roomLink.attr('href', Drupal.settings.chatroom.roomBase + chats[i].nid);
        if (roomLink[0].href == window.location) {
          roomLink.addClass('active');
        }
        var span = $('<span>');
        span.append(roomLink);
        span.html('in '+ span.html());
        span.addClass('chatroomLink');
        var li = $('<li>');
        li.attr('id', chats[i].chatListId);
        li.append(chatLink);
        li.append('<br />');
        li.append(span);
        chatList.prepend(li);
      }
    }
  }
}

/**
 * Update the active chat rooms block.
 */
Drupal.chatroom.block.updateChatrooms = function(chatrooms) {
  var chatroomList = $('#chatroom-sitewide-chatrooms');
  if (chatroomList.length > 0) {
    Drupal.settings.chatroom.roomTimestamp = chatrooms.pop(); // Set timestamp for use in next update request.
    var chatroomListItems = $('li', chatroomList); // Get the current list of chat rooms.
    if (chatrooms.length == 0) {
      if (chatroomListItems.attr('id') != 'chatroom_empty') {
        var li = $('<li>');
        li.attr('id', 'chatroom_empty');
        li.css('fontStyle', 'italic');
        li.append(Drupal.settings.chatroom.roomsMessage);
        chatroomList.empty();
        chatroomList.append(li);
      }
    }
    else {
      for (var i = 0; i < chatroomListItems.length; i++) { // Delete items not in the new chat rooms list.
        var chatroomItem = $(chatroomListItems[i]);
        var deleteFlag = true;
        for (var j = 0; j < chatrooms.length; j++) {
          if (chatroomItem.attr('id') == chatrooms[j].chatroomListId) {
            deleteFlag = false;
            chatrooms.splice(j, 1);
            break;
          }
        }
        if (deleteFlag) {
          chatroomItem.remove();
        }
      }
      for (var i = 0; i < chatrooms.length; i++) {
        var chatroomLink = $('<a>');
        chatroomLink.append(chatrooms[i].chatroomName);
        chatroomLink.attr('href', Drupal.settings.chatroom.roomBase + chatrooms[i].nid);
        var li = $('<li>');
        li.attr('id', chatrooms[i].chatroomListId);
        li.append(chatroomLink);
        chatroomList.prepend(li);
      }
    }
  }
}

/**
 * gets updates from the server for chatroom blocks
 */
Drupal.chatroom.block.getUpdates = function() {
  var postData = {
    block_update:1,
    drupal_base:Drupal.settings.chatroom.drupalBase,
    base_url:Drupal.settings.chatroom.baseUrl,
    chatroom_base:Drupal.settings.chatroom.chatroomBase,
    user_base:Drupal.settings.chatroom.userBase
  };
  var checkBlocks = false;
  if ($('#chatroom-sitewide-chatrooms').length > 0) {
    postData.room_cache_file = Drupal.settings.chatroom.roomsCacheFile;
    postData.room_timestamp  = Drupal.settings.chatroom.roomTimestamp;
    checkBlocks = true;
  }
  if ($('#chatroom-sitewide-chats').length > 0) {
    postData.chat_cache_file = Drupal.settings.chatroom.chatsCacheFile;
    postData.chat_timestamp  = Drupal.settings.chatroom.chatTimestamp;
    checkBlocks = true;
  }
  if ($('#chatroom-sitewide-online').length > 0) {
    postData.uid = Drupal.settings.chatroom.uid;
    checkBlocks = true;
  }
  if (checkBlocks) {
    return $.post(Drupal.settings.chatroom.updateUrl, postData, Drupal.chatroom.block.blockCallback);
  }
  return;
}

// Global Killswitch
if (Drupal.jsEnabled) {
  $(document).ready(Drupal.chatroom.block.addEvents);
}

