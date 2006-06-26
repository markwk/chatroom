/* $Id$ */
/**
 * function to add chatroom events handlers to the onscreen widgets
 */
var chatroomAddEvents = function() {
  chatroomLoadHexColours();
  $('chatroom-msg-submit').onclick= function() {
    chatroomSendMessage('button');
    return false;
  }
  $('chatroom-msg-input').onkeyup = function(e) { 
    chatroomInputOnkeyup(this, e); 
    return true;
  };
  chatroomGetUpdates();
  setInterval("chatroomGetUpdates()", chatroom.updateInterval);
  chatroomLoadUserList();
  return;
}

/**
 * handles response from HTTP requests
 */
var chatroomCallback = function(responseText, HttpRequest, chatroomDummyParam) {
  if (HttpRequest.responseText) {
    var resArray = eval(HttpRequest.responseText);
    if (typeof resArray == 'object' && typeof resArray.length != 'undefined') {
      if (chatroom.debugMode) {
        chatroomUpdateDebugInfo(HttpRequest, resArray[0].length);
      }
      if (resArray[0].length) {
        chatroomUpdateMsgList(resArray[0]);
      }
      if (resArray[1].length) {
        chatroomUpdateOnlineList(resArray[1]);
      }
      if (typeof resArray[2].cacheTimestamp != 'undefined') {
        chatroom.cacheTimestamp = resArray[2].cacheTimestamp;
      }
    }
  }
  return;
}

/**
 * displays debug info
 */
function chatroomUpdateDebugInfo(HttpRequest, cacheMiss) {
  if (cacheMiss) {
    chatroom.cacheMisses++;
  }
  $('chatroom-debug').removeChild($('chatroom-debug-cache-stats'));
  var p = document.createElement('p');
  p.id = 'chatroom-debug-cache-stats';
  var cacheInfo = 'updates: ' + chatroom.updateCount + ' cache misses: ' + chatroom.cacheMisses;
  p.appendChild(document.createTextNode(cacheInfo));
  $('chatroom-debug').appendChild(p);
}

/**
 * function to load initial user list on page load
 */
function chatroomLoadUserList() {
  var ul = document.createElement('ul');
  ul.id = 'chatroom-online-list';
  $('chatroom-online').appendChild(ul);
  for (i = 0; i < chatroom.userList.length; i++) {
    var li = document.createElement('li');
    if (chatroom.userList[i].uid == 0) {
      var userInfo = document.createTextNode(chatroom.userList[i].user);
    }
    else {
      var userInfo = document.createElement('a');
      userInfo.appendChild(document.createTextNode(chatroom.userList[i].user));
      userInfo.setAttribute('href', chatroomGetUrl('user') + chatroom.userList[i].uid);
      userInfo.style.color = chatroomGetUserColour(chatroom.userList[i].user);
    }
    li.id = chatroom.userList[i].sessionId;
    li.style.fontWeight = 'bold';
    li.style.color = chatroomGetUserColour(chatroom.userList[i].user);
    if (chatroom.sessionId == chatroom.userList[i].sessionId) {
      addClass(li, 'chatroom-current-user');
    }
    li.appendChild(userInfo);
    ul.appendChild(li);
  }
}

/**
 * function to handle input to the message board
 */
function chatroomInputOnkeyup(input, e) {
  if (!e) {
    e = window.event;
  }
  switch (e.keyCode) {
    case 13:  // return/enter 
      chatroomSendMessage('enter');
      break;
  }
}

/**
 * sends text of message to the server
 */
function chatroomSendMessage() {
  var msg = {chatroomMsg:$('chatroom-msg-input').value.replace(/^\s+|\s+$/, '')};
  $('chatroom-msg-input').value = '';
  $('chatroom-msg-input').focus();
  if (msg.chatroomMsg) {
    chatroom.skipUpdate = true;
    chatroom.updateCount++;
    HTTPPost(chatroomGetUrl('write'), chatroomCallback, false, msg);
  }
}

/**
 * return the appropriate url
 */
function chatroomGetUrl(type) {
  switch (type) {
    case 'read':
      return chatroom.readUrl +'?chat_id='+ chatroom.chatId +'&last_msg_id='+ chatroom.lastMsgId 
             +'&update_count='+ chatroom.updateCount +'&timestamp='+ chatroom.cacheTimestamp;
    case 'write':
      return chatroom.writeUrl + chatroom.chatId + '/' + chatroom.lastMsgId;
    case 'user':
      return chatroom.userUrl;
  }
}

/**
 * updates message list with response from server
 */
function chatroomUpdateMsgList(msgs) {
  var msgBoard = $('chatroom-board');
  for (i = 0; i < msgs.length; i++) {
    if (chatroomUpdateLastMsg(msgs[i].id)) {
      var span = document.createElement('span');
      if (chatroom.updateCount != 1) {
        span.style.color = chatroomGetUserColour(msgs[i].user);
        span.style.fontWeight = 'bold';
      }
      span.appendChild(document.createTextNode('[' + msgs[i].time + '] ' + msgs[i].user + ': '));
      var scroll = true;
      var p = document.createElement('p');
      p.className = 'chatroom-msg';
      p.appendChild(span);
      p.appendChild(document.createTextNode(msgs[i].text));
      if (chatroom.updateCount == 1) {
        addClass(p, 'chatroom-old-msg');
      }
      msgBoard.appendChild(p);
    }
  }
  if (scroll) {
    msgBoard.scrollTop = msgBoard.scrollHeight;
  }
}

/**
 * take a list of users and draw a whois online list
 */
function chatroomUpdateOnlineList(updateUsers) {
  var usersToDelete = Array();
  var deleteFlag = true;
  var count = 0;
  for (i = 0; i < chatroom.userList.length; i++) {
    deleteFlag = true;
    for (j = 0; j < updateUsers.length; j++) {
      if (chatroom.userList[i].sessionId == updateUsers[j].sessionId) {
        deleteFlag = false;
        updateUsers[j].noAdd = 1;
      }
    }
    if (deleteFlag) {
      usersToDelete.push(i);
    }
  }
  for (i = 0; i < usersToDelete.length; i++) {
    $('chatroom-online-list').removeChild($(chatroom.userList[usersToDelete[i]].sessionId));
    chatroom.userList.splice(usersToDelete[i], 1);
  }
  for (i = 0; i < updateUsers.length; i++) {
    if (typeof updateUsers[i].noAdd == 'undefined') {
      chatroom.userList.push(updateUsers[i]);
      var li = document.createElement('li');
      li.id = updateUsers[i].sessionId;
      if (updateUsers[i].uid == 0) {
        var userInfo = document.createTextNode(updateUsers[i].user);
      }
      else {
        var userInfo = document.createElement('a');
        userInfo.appendChild(document.createTextNode(updateUsers[i].user));
        userInfo.setAttribute('href', chatroomGetUrl('user') + updateUsers[i].uid);
        userInfo.style.color = chatroomGetUserColour(updateUsers[i].user);
      }
      li.style.fontWeight = 'bold';
      li.style.color = chatroomGetUserColour(updateUsers[i].user);
      li.appendChild(userInfo);
      $('chatroom-online-list').appendChild(li);
    }
  }
}

/**
 * gets updates from the server for this chat
 */
function chatroomGetUpdates() {
  if (chatroom.skipUpdate) {
    chatroom.skipUpdate = false;
    return;
  }
  chatroom.updateCount++;
  return HTTPGet(chatroomGetUrl('read'), chatroomCallback, false);
}

/**
 * update last seen message id
 */
function chatroomUpdateLastMsg(msgId) {
  if (msgId > chatroom.lastMsgId) {
    chatroom.lastMsgId = msgId;
    return true;
  }
  return false;
}

/**
 * gets the colour for given user
 */
function chatroomGetUserColour(user) {
  for (j = 0; j < chatroom.userList.length; j++) {
    if (chatroom.userList[j].user == user) {
      if (typeof chatroom.userList[j].colour != 'undefined') {
        return chatroom.userList[j].colour;
      }
      while (1) {
        var k = Math.round(chatroom.userColours.length * Math.random());
        if (chatroom.userColours[k].unUsed) {
          chatroom.userColours[k].unUsed = false;
          chatroom.userList[j].colour = chatroom.userColours[k].colour;
          return chatroom.userList[j].colour;
        }
      }
    }
  }
  return '#000000';
}

/**
 * loads chatroomColours with some dark hex values
 */
function chatroomLoadHexColours() {
  var hex = ['00', '33', '66', '99', 'CC', 'FF'];
  for (i = 0; i < hex.length; i++) {
    for (j = 0; j < hex.length; j++) {
      for (k = 0; k < hex.length; k++) {
        if ((3 + i + j + k) < 8) {
          chatroom.userColours[chatroom.userColours.length] = {colour:'#' + hex[i] + hex[j] + hex[k], unUsed:true};    
        }
      }
    }
  }
}

// Global Killswitch
if (isJsEnabled()) {
  addLoadEvent(chatroomAddEvents);
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
