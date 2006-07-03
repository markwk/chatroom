/* $Id$ */
/**
 * function to add chatroom events handlers to the onscreen widgets
 */
var chatroomAddEvents = function() {
  chatroom.cachePath = chatroom.moduleBase + chatroom.cacheFile;
  chatroomLoadHexColours();
  $('chatroom-msg-submit').onclick= function() {
    chatroomSendMessage();
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
 * handles response from msg HTTP requests
 */
var chatroomMsgCallback = function(responseText, HttpRequest, chatroomDummyParam) {
  if (HttpRequest.responseText) {
    var resArray = eval(HttpRequest.responseText);
    if (typeof resArray == 'object' && typeof resArray.length != 'undefined') {
      if (resArray[0].length) {
        var scroll = chatroomUpdateMsgList(resArray[0]);
      }
      if (resArray[1].length) {
        chatroomUpdateOnlineList(resArray[1]);
      }
      if (resArray.length > 2) {
        chatroom.cacheTimestamp = resArray[2].cacheTimestamp;
      }
    }
  }
  if (scroll) {
    var msgBoard = $('chatroom-board');
    msgBoard.scrollTop = msgBoard.scrollHeight;
  }
  return;
}

/**
 * handles response from command HTTP requests
 */
var chatroomCmdCallback = function(responseText, HttpRequest, chatroomDummyParam) {
  if (HttpRequest.responseText) {
    alert(HttpRequest.responseText);
  }
  return;
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
      chatroomSendMessage();
      break;
  }
}

/**
 * sends text of message to the server
 */
function chatroomSendMessage() {
  var text = $('chatroom-msg-input').value.replace(/^\s+/g, '');
  if (text.search(/^\/(me|whois|away|msg)/) != -1) {
    return chatroomSendCommand(text);
  }
  else if (text == '') {
    return;
  }
  var msg = {chatroomMsg:text};
  $('chatroom-msg-input').value = '';
  $('chatroom-msg-input').focus();
  chatroom.skipUpdate = true;
  chatroom.updateCount++;

  msg.module_base = chatroom.moduleBase;
  msg.chatroomMsg = escape(msg.chatroomMsg);
  msg.chat_id     = chatroom.chatId;
  msg.last_msg_id = chatroom.lastMsgId;
  HTTPPost(chatroomGetUrl('write'), chatroomMsgCallback, false, msg);
}

/**
 * process a command and sends it to the server
 */
function chatroomSendCommand(text) {
  $('chatroom-msg-input').value = '';
  $('chatroom-msg-input').focus();

  var cmd  = text.replace(/^\//, '').split(' ')[0];
  var args = text.replace(/^\//, '').split(' ').slice(1);

  switch (cmd) {
    case 'msg':
      if (args.length < 2) {
        return;
      }
      else {
        var user = args.shift();
      }
      for (i =0; i < chatroom.userList.length; i++) {
        if (chatroom.userList[i].user == user) {
          if (chatroom.userList[i].sessionId == chatroom.sessionId) {
            return;
          }
          var msg = {chatroomMsg:escape(args.join(' '))};
          msg.module_base = chatroom.moduleBase;
          msg.chat_id     = chatroom.chatId;
          msg.last_msg_id = chatroom.lastMsgId;
          msg.recipient   = chatroom.userList[i].sessionId;
          return HTTPPost(chatroomGetUrl('write'), chatroomMsgCallback, false, msg);
        }
      }
      break;

    case 'me':
      if (args.length == 0) {
        return;
      }
      else {
        var msg = {chatroomMsg:escape(args.join(' '))};
        msg.module_base = chatroom.moduleBase;
        msg.chat_id     = chatroom.chatId;
        msg.last_msg_id = chatroom.lastMsgId;
        msg.type        = 'me';
        return HTTPPost(chatroomGetUrl('write'), chatroomMsgCallback, false, msg);
      }
      break;
  }
}

/**
 * return the appropriate url
 */
function chatroomGetUrl(type) {
  switch (type) {
    case 'read':
    case 'write':
    case 'command':
      return chatroom.chatUrl;
    case 'user':
      return chatroom.userUrl;
  }
}

/**
 * updates message list with response from server
 */
function chatroomUpdateMsgList(msgs) {
  var msgBoard = $('chatroom-board');
  var scroll = false;
  for (i = 0; i < msgs.length; i++) {
    if (chatroomUpdateLastMsg(msgs[i].id)) {
      var span = document.createElement('span');
      if (chatroom.updateCount != 1) {
        span.style.color = chatroomGetUserColour(msgs[i].user);
        span.style.fontWeight = 'bold';
      }
      if (msgs[i].recipient) {
        span.appendChild(document.createTextNode('[' + msgs[i].time + '] ' + msgs[i].user + ' private: '));
      }
      else if (msgs[i].type == 'me') {
        span.appendChild(document.createTextNode('* ' + msgs[i].user + ' ' + msgs[i].text));
        span.style.fontStyle = 'italic';
        if (chatroom.updateCount != 1) {
          span.style.color = '#7777FF';
        }
      }
      else {
        span.appendChild(document.createTextNode('[' + msgs[i].time + '] ' + msgs[i].user + ': '));
      }
      scroll = true;
      var p = document.createElement('p');
      if (chatroom.updateCount == 1) {
        addClass(p, 'chatroom-old-msg');
      }
      else if (msgs[i].type == 'me') {
        addClass(p, 'chatroom-me-msg');
      }
      else {
        addClass(p, 'chatroom-msg');
      }
      p.appendChild(span);
      if (msgs[i].type != 'me') {
        p.appendChild(document.createTextNode(msgs[i].text));
      }
      msgBoard.appendChild(p);
    }
  }
  return scroll;
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
  var postData = {chat_id:chatroom.chatId};
  postData.last_msg_id  = chatroom.lastMsgId;
  postData.timestamp    = chatroom.cacheTimestamp;
  postData.update_count = ++chatroom.updateCount;
  postData.module_base  = chatroom.moduleBase;
  postData.cache_file   = chatroom.cacheFile;
  return HTTPPost(chatroomGetUrl('read'), chatroomMsgCallback, false, postData);
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
