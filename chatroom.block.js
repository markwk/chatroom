/* $Id$ */

/**
 * function to add chatroom events handlers to the onscreen widgets
 */
var chatroomBlockAddEvents = function() {
  setInterval("chatroomBlockGetUpdates()", chatroomBlock.updateInterval);
  
  // if there's an online user list and this is a Drupal user, attach onclicks
  if ($('chatroom-sitewide-online') && chatroomBlock.uid > 0) {
    var userList = $('chatroom-sitewide-online').getElementsByTagName('a');
    for (var i = 0; i < userList.length; i++) {
      userList[i].onclick = function() {
        chatroomBlockSendInvite(this);
        return false;
      }
    }
  }
  // if there are any invites for this user, attach onclicks
  if ($('chatroom-invites')) {
    var invites = $('chatroom-invites').getElementsByTagName('a');
    if (typeof invites.length != 'undefined') {
      for (var i = 0; i < invites.length; i++) {
        if (invites[i].id.indexOf('accepted') == -1) {
          invites[i].onclick = function() {
            chatroomBlockAcceptInvite(this);
            return false;
          }
        }
        else {
          invites[i].onclick = function() {
            chatroomBlockStartChat(this);
            return false;
          }
        }
      }
    }
  }
  return;
}

/**
 * handles response from msg HTTP requests
 */
var chatroomBlockCallback = function(responseText, HttpRequest, chatroomDummyParam) {
  if (HttpRequest.responseText) {
    var resArray = eval(HttpRequest.responseText);
    if (typeof resArray == 'object' && typeof resArray.length != 'undefined') {
      for (var i = 0; i < resArray.length; i++) {
        if (typeof resArray[i].timestamp != 'undefined') {
          chatroomBlockUpdateActiveChatList(resArray[i].chatList);
          break;
        }
        if (typeof resArray[i].chatList != 'undefined') {
          chatroomBlockUpdateActiveChatList(resArray[i].chatList);
          break;
        }
        if (typeof resArray[i].chatroomList != 'undefined') {
          chatroomBlockUpdateActiveChatroomList(resArray[i].chatroomList);
          break;
        }
        if (typeof resArray[i].userList != 'undefined') {
          chatroomBlockUpdateOnlineList(resArray[i].userList);
          break;
        }
        if (typeof resArray[i].chatInvites != 'undefined') {
          chatroomBlockHandleInvites(resArray[i].chatInvites);
        }
      }
    }
  }
  return;
}

/**
 * accepts an invite
 */
function chatroomBlockAcceptInvite(invite) {
  alert('not implemented yet');
}

/**
 * starts a popout chat
 */
function chatroomBlockStartChat(invite) {
  alert('not implemented yet');
}

/**
 * handles updating the sitewide active chat list
 */
function chatroomBlockSendInvite(userLink) {
  var msg = {block_update:1,chatroom_base:chatroomBlock.moduleBase,user_base:chatroomBlock.userBase};
  msg.inviter_uid = chatroomBlock.uid;
  msg.invitee_uid = userLink.id.split('-')[1];
  HTTPPost(chatroomBlock.blockUrl, chatroomBlockCallback, false, msg);
}

/**
 * handles updating the sitewide online list
 */
function chatroomBlockUpdateOnlineList(userList) {
  var usersToDelete = [];
  var deleteFlag = true;

  // loop through the in browser user list
  for (var i = 0; i < chatroomBlockUsers.length; i++) {
    deleteFlag = true;
    
    // loop through the list sent from the server 
    for (var j = 0; j < userList.length; j++) {      
      if (chatroomBlockUsers[i].uid == userList[j].uid) {
        deleteFlag = false;
        userList[j].noAdd = 1;
      }
    }
    if (deleteFlag) {
      usersToDelete.push([i, 'user-li-'+ chatroomBlockUsers[i].uid]);
    }
  }

  // delete the flagged users
  for (var i = 0; i < usersToDelete.length; i++) {
    $('chatroom-sitewide-online').removeChild($(usersToDelete[i][1]));
    chatroomBlockUsers.splice(usersToDelete[i][0], 1);
  }

  // add the users who are not in the browser list, but where in the update list
  for (var i = 0; i < userList.length; i++) {
    if (typeof userList[i].noAdd == 'undefined') {
      chatroomBlockUsers.push(userList[i]);
      
      var userInfo = document.createElement('a');
      userInfo.id = 'user-'+ userList[i].uid;
      userInfo.appendChild(document.createTextNode(userList[i].user));
      userInfo.setAttribute('href', '#');
      userInfo.onclick = function() {
        chatroomBlockSendInvite(this);
        return false;
      }

      var li = document.createElement('li');
      li.id = 'user-li-'+ userList[i].uid;
      li.style.fontWeight = 'bold';
      li.appendChild(userInfo);      
      $('chatroom-sitewide-online').appendChild(li);          
    }
  }
}

/**
 * handles updating the sitewide active chat list
 */
function chatroomBlockUpdateActiveChatList(chats) {
  var chatList = $('chatroom-sitewide-chats');
  var chatsToDelete = [];

  if (chatList) {
    // reset the timestamp
    chatroomBlock.chatTimestamp = chats.pop();

    // get the list of chats
    var chatListItems = chatList.getElementsByTagName('li');

    // if there's no chats to add
    if (chats.length == 0) {
      // and there's only the 'no chats' item, exit
      if (chatListItems[0].id == 'chat_empty') {
        return;
      }
    }
    
    // delete items not in chats array 
    for (i = 0; i < chatListItems.length; i++) {
      var deleteFlag = true;
      for (j = 0; j < chats.length; j++) {
        if (chatListItems[i].id == chats[j].chatListId) {
          deleteFlag = false;
          chats[j].noAdd = 1;
        }
      }
      if (deleteFlag) {
        chatsToDelete.push(chatListItems[i].id);
      }
    }
    for (i = 0; i < chatsToDelete.length; i++) {
      chatList.removeChild($(chatsToDelete[i]));
    }

    // if we deleted all the items and there's nothing to add
    if (chatList.childNodes.length == 0 && chats.length == 0) {
      // add the 'no chats' li and exit
      var li = document.createElement('li');
      li.id = 'chat_empty';
      li.style.fontStyle = 'italic';
      li.appendChild(document.createTextNode('There are no active chats'));
      chatList.appendChild(li);
      return;
    }

    // add chats to the list
    for (i = 0; i < chats.length; i++) {
      if (typeof chats[i].noAdd == 'undefined') {
        var chatLink = document.createElement('a');
        chatLink.appendChild(document.createTextNode(chats[i].chatName));
        chatLink.setAttribute('href', chatroomBlock.chatBase + chats[i].ccid);

        var span = document.createElement('span');
        addClass(span, 'chatroomLink');
        span.appendChild(document.createTextNode('in room '));
        var roomLink = document.createElement('a');
        roomLink.appendChild(document.createTextNode(chats[i].roomName));
        roomLink.setAttribute('href', chatroomBlock.roomBase + chats[i].crid);
        span.appendChild(roomLink);

        var li = document.createElement('li');
        li.id = chats[i].chatListId;
        li.appendChild(chatLink);
        li.appendChild(document.createElement('br'));
        li.appendChild(span);

        chatList.appendChild(li);
      }
    }
  }
}

/**
 * handles updating the sitewide active chatroom list
 */
function chatroomBlockUpdateActiveChatroomList(chatrooms) {
  var chatroomList = $('chatroom-sitewide-chatrooms');
  var chatroomsToDelete = [];

  if (chatroomList) {
    // reset the timestamp
    chatroomBlock.chatTimestamp = chatrooms.pop();

    // get the list of chatrooms
    var chatroomListItems = chatroomList.getElementsByTagName('li');

    // if there's no chatrooms to add
    if (chatrooms.length == 0) {
      // and there's only the 'no chatrooms' item, exit
      if (chatroomListItems[0].id == 'chatroom_empty') {
        return;
      }
    }
    
    // delete items not in chatrooms array 
    for (i = 0; i < chatroomListItems.length; i++) {
      var deleteFlag = true;
      for (j = 0; j < chatrooms.length; j++) {
        if (chatroomListItems[i].id == chatrooms[j].chatroomListId) {
          deleteFlag = false;
          chatrooms[j].noAdd = 1;
        }
      }
      if (deleteFlag) {
        chatroomsToDelete.push(chatroomListItems[i].id);
      }
    }
    for (i = 0; i < chatroomsToDelete.length; i++) {
      chatroomList.removeChild($(chatroomsToDelete[i]));
    }

    // if we deleted all the items and there's nothing to add
    if (chatroomList.childNodes.length == 0 && chatrooms.length == 0) {
      // add the 'no chatrooms' li and exit
      var li = document.createElement('li');
      li.id = 'chatroom_empty';
      li.style.fontStyle = 'italic';
      li.appendChild(document.createTextNode('There are no active chatrooms'));
      chatroomList.appendChild(li);
      return;
    }

    // add chatrooms to the list
    for (i = 0; i < chatrooms.length; i++) {
      if (typeof chatrooms[i].noAdd == 'undefined') {
        var chatroomLink = document.createElement('a');
        chatroomLink.appendChild(document.createTextNode(chatrooms[i].chatroomName));
        chatroomLink.setAttribute('href', chatroomBlock.roomBase + chatrooms[i].crid);

        var li = document.createElement('li');
        li.id = chatrooms[i].chatroomListId;
        li.appendChild(chatroomLink);
        chatroomList.appendChild(li);
      }
    }
  }
}

/**
 * gets updates from the server for chatroom blocks
 */
function chatroomBlockHandleInvites(invites) {
  // if we don't have an invite list yet, create one
  if ($('chatroom-invites')) {
    var inviteList = $('chatroom-invites');
  }
  else {
    var inviteList = document.createElement('div');
    inviteList.id = 'chatroom-invites';
    $('chatroom-sitewide-online').appendChild(inviteList);
  }
  for (var i = 0; i < invites.length; i++) {
    var msg = invites[i];

    if (typeof msg.ccid == 'undefined') {
      // we got an invite
      if (!$('invite-'+ msg.uid)) {
        var a = document.createElement('a');
        a.setAttribute('href', msg.uid);
        a.id = 'invite-'+ msg.uid;
        a.appendChild(document.createTextNode('User '+ msg.user +' has invited you to chat'));
        a.onclick= function() {
          chatroomBlockAcceptInvite(this);
          return false;
        }
        var p = document.createElement('p');
        p.appendChild(a);
        $('chatroom-invites').appendChild(p);
      }
    }
    else {
      // an invite of ours was accepted
      if (!$('accepted-'+ msg.uid)) {
        var a = document.createElement('a');
        a.setAttribute('href', chatroomBlock.siteBase +'chatrooms/popout-chat/'+ msg.cciid);
        a.id = 'accepted-'+ msg.uid;
        a.onclick= function() {
          chatroomBlockStartChat(this);
          return false;
        }
        a.appendChild(document.createTextNode('User '+ msg.user +' has accepted your invite you to chat'));
        var p = document.createElement('p');
        p.appendChild(a);
        $('chatroom-invites').appendChild(p);
      }
    }

  }
}

/**
 * gets updates from the server for chatroom blocks
 */
function chatroomBlockGetUpdates() {
  var postData = {block_update:1,chatroom_base:chatroomBlock.moduleBase,user_base:chatroomBlock.userBase};
  var checkBlocks = false;
  if ($('chatroom-sitewide-chatrooms')) {
    postData.room_cache_file = chatroomBlock.roomCacheFile;
    postData.room_timestamp  = chatroomBlock.roomTimestamp;
    checkBlocks = true;
  }
  if ($('chatroom-sitewide-chats')) {
    postData.chat_cache_file = chatroomBlock.chatCacheFile;
    postData.chat_timestamp  = chatroomBlock.chatTimestamp;
    checkBlocks = true;
  }
  if ($('chatroom-sitewide-online')) {
    postData.uid = chatroomBlock.uid;
    checkBlocks = true;
  }
  if (checkBlocks) {
    return HTTPPost(chatroomBlock.blockUrl, chatroomBlockCallback, false, postData);
  }
  return;
}

// Global Killswitch
if (isJsEnabled()) {
  addLoadEvent(chatroomBlockAddEvents);
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
