/* $Id$ */
/**
 * function to add chatroom events handlers to the onscreen widgets
 */
var chatroomAddEvents = function() {
  chatroom.cachePath = chatroom.chatroomBase + chatroom.chatCacheFile;
  chatroomLoadHexColours();
  chatroomSetUserColours();
  $('chatroom-msg-submit').onclick= function() {
    chatroomSendMessage();
    return false;
  }
  $('chatroom-msg-input').onkeyup = function(e) { 
    chatroomInputOnkeyup(this, e); 
    return true;
  };
  $('chatroom-msg-away').onclick = function() { 
      chatroomSetAway(this);       
  };
  for (var i = 0; i < chatroom.userList.length; i++) {
    if (chatroom.userList[i].sessionId == chatroom.sessionId) {
      $('chatroom-msg-away').checked = chatroom.userList[i].away;
    }
  }
  chatroomGetUpdates();
  setInterval("chatroomGetUpdates()", chatroom.updateInterval);  
  return;
}

/**
 * handles response from msg HTTP requests
 */
var chatroomMsgCallback = function(responseText, HttpRequest, chatroomDummyParam) {
  if (HttpRequest.responseText) {
    var resArray = eval(HttpRequest.responseText);
    if (typeof resArray == 'object' && typeof resArray.length != 'undefined') {
      for (var i = 0; i < resArray.length; i++) {
        if (typeof resArray[i].cacheTimestamp != 'undefined') {
          chatroom.cacheTimestamp = resArray[i].cacheTimestamp;
          continue;
        }
        if (typeof resArray[i].msgs != 'undefined') {
          chatroomUpdateMsgList(resArray[i].msgs);
          continue;
        }
        if (typeof resArray[i].onlineList != 'undefined') {
          chatroomUpdateChatOnlineList(resArray[i].onlineList);
          continue;
        }
        if (typeof resArray[i].kickUser != 'undefined') {
          chatroomEjectUser(resArray[i].kickUser, 'kick');
        }
        if (typeof resArray[i].banUser != 'undefined') {
          chatroomEjectUser(resArray[i].banUser, 'ban');
        }
      }
    }
  }
  return;
}

/**
 * function to kick a user out of a chat
 */
function chatroomEjectUser(sessionId, type) {
  if (chatroom.sessionId == sessionId) {
    window.location = chatroom[type +'Url'] +'/'+ chatroom.chatId;
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
  var text = $('chatroom-msg-input').value;
  if (text == '' || text.match(/^\s+$/)) {
    $('chatroom-msg-input').value = '';
    $('chatroom-msg-input').focus();
    return;
  }
  $('chatroom-msg-input').value = '';
  $('chatroom-msg-input').focus();
  if (text.search(/^\/(me|away|msg|back|kick|close|ban)/) != -1) {
    var msg = chatroomGetCommandMsg(text);
    if (!msg) {
      return;
    }
  }
  else {
    var msg = {chatroomMsg:text};
  }
  chatroom.skipUpdate = true;
  chatroom.updateCount++;
  HTTPPost(chatroomGetUrl('write'), chatroomMsgCallback, false, chatroomPrepareMsg(msg));
}

/**
 * prepare a msg object
 */
function chatroomPrepareMsg(msg) {
  if (chatroom.smileysBase) {
    msg.smileys_base = chatroom.smileysBase;
  }
  if (chatroom.onlineList) {
    msg.online_list = 1;
  }
  msg.chatroom_base   = chatroom.chatroomBase;
  msg.update_count    = chatroom.updateCount;
  msg.user_base       = chatroom.userBase;
  msg.chat_id         = chatroom.chatId;
  msg.last_msg_id     = chatroom.lastMsgId;
  msg.timezone        = chatroom.timezone;
  msg.timestamp       = chatroom.cacheTimestamp;
  msg.chat_cache_file = chatroom.chatCacheFile;
  return msg;
}

/**
 * get a command msg object
 */
function chatroomGetCommandMsg(text) {
  var msg = {type:text.replace(/^\//, '').split(' ')[0]};
  var args = text.replace(/^\//, '').split(' ').slice(1);
  switch (msg.type) {
    case 'me':
      // no point sending an empty message 
      if (!args.length) {
        return false;
      }
      msg.chatroomMsg = args.join(' ');
      return msg;

    case 'msg':
    case 'kick':
    case 'ban':
      if (!args.length) {
        return false;
      }
      
      // try to find the user with this name
      var user = '';
      do {
        user += (user ? ' ' : '') + args.shift();
        msg.recipient = chatroomFindUser(user);
      } while (!msg.recipient && args.length);
      
      // noone with this name in the chat
      if (!msg.recipient) {
        return false;
      }

      if (msg.type == 'ban') {
        msg.uid = chatroomGetUid(msg.recipient);
        // can only ban Drupal users, not guests
        if (!msg.uid) {
          return false;
        }
        msg.admin_uid = chatroom.userList[0].uid;
      }

      if (msg.type == 'msg') {
        // no point sending an empty message 
        if (!args.length) {
          return false;
        }
        msg.chatroomMsg = args.join(' ');
      }
      return msg;

    case 'away':
    case 'back':
      $('chatroom-msg-away').checked = (msg.type == 'away');
      msg.chatroomMsg = msg.type;
      return msg;
  }
}

/**
 * looks up a users uid from the session id
 */
function chatroomGetUid(sessionId) {
  for (var i = 0; i < chatroom.userList.length; i++) {
    if (chatroom.userList[i].sessionId == sessionId) {
      return chatroom.userList[i].uid;
    }
  }
  return false;
}

/**
 * find a user in the user list - returns the sessionId or false
 */
function chatroomFindUser(user) {
  for (var i = 0; i < chatroom.userList.length; i++) {
    if (chatroom.userList[i].user == user) {
      return chatroom.userList[i].sessionId;
    }
  }
  return false;
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
 * To do: Move msgs formating to php so things like using t() can be done 
 */
function chatroomUpdateMsgList(msgs) {
  var msgBoard = $('chatroom-board');
  var scroll = false;
  for (var i = 0; i < msgs.length; i++) {
    if (chatroomUpdateLastMsg(msgs[i].id)) {        
      var p = document.createElement('p');
      if (chatroom.updateCount == 1) {
        // first load of page - greys out old msgs
        addClass(p, 'chatroom-old-msg');        
      }
      else if (msgs[i].type == 'me') {
        // * <username> msg - italicised
        addClass(p, 'chatroom-me-msg');
      }
      else {
        // normal msg
        addClass(p, 'chatroom-msg');
        p.style.color = chatroomGetUserColour(msgs[i].user);        
      }

      if (msgs[i].recipient) {
        // private msg
        var span = document.createElement('span');
        addClass(span, 'header');
        span.appendChild(document.createTextNode(msgs[i].user +' '));

        var privSpan = document.createElement('span');
        privSpan.appendChild(document.createTextNode(' (privately): '));
        addClass(privSpan, 'chatroom-private');        
        span.appendChild(privSpan);
        p.appendChild(span);              
        chatroom.lastUser = '';        
      }
      else if (msgs[i].type == 'me') {
        // * <username> msg
        p.appendChild(document.createTextNode('* ' + msgs[i].user + ' '));          
        chatroom.lastUser = '';        
      }
      else {             
        // normal msg
        if (msgs[i].user != chatroom.lastUser) {
          var span = document.createElement('span');
          addClass(span, 'header');
          span.appendChild(document.createTextNode(msgs[i].user + ':'));               
          p.appendChild(span);              
        }                
      }  
      
      // indent if this message comes from the same user
      if (msgs[i].user == chatroom.lastUser) {
        var indentP = document.createElement('p');
        addClass(indentP, 'indent');
        indentP = chatroomProcessMsgText(indentP, msgs[i].text);
        p.appendChild(indentP);              
      }
      else {
        p = chatroomProcessMsgText(p, msgs[i].text);
      }
      
      // make sure the sender of this message is not set as away
      chatroomSetAsBack(msgs[i].user);
      
      // add to board
      msgBoard.appendChild(p);
      chatroom.lastUser    = msgs[i].user;
      chatroom.lastMsgTime = msgs[i].time;
      scroll = true;      
    }    
  }  
  if (chatroom.updateCount == 1) {
    chatroom.lastUser = '';
  } 
  else {
    chatroomSetWriteTime();
  }
  if (scroll) {
    var msgBoard = $('chatroom-board');
    msgBoard.scrollTop = msgBoard.scrollHeight;
  }
}

/**
 * set a user as back if they send a message
 */
function chatroomSetAsBack(user) {
  for (var i = 0; i < chatroom.userList.length; i++) {
    if (chatroom.userList[i].user == user) {
      // update the online list
      chatroom.userList[i].away = 0;
      sessionId = chatroom.userList[i].sessionId;

      // update on screen display
      removeClass($(sessionId), 'chatroom-user-away');

      // make sure away box is unchecked
      if (chatroom.sessionId == sessionId) {
        $('chatroom-msg-away').checked = 0;
      }
      return;
    }
  }
}

/**
 * process msgText and append to given domNode
 */
function chatroomProcessMsgText(domNode, text) {
  if (!chatroom.smileysBase) {
    domNode.appendChild(document.createTextNode(text));
  }
  else if (text.indexOf(chatroom.smileysMarker) == -1) {
    domNode.appendChild(document.createTextNode(text));
  }
  else {
    var bits = text.split(chatroom.smileysMarker);
    for (var i = 0; i < bits.length; i++) {
      if ($(bits[i])) {
        domNode.appendChild($(bits[i]).cloneNode(true));
      }
      else {
        domNode.appendChild(document.createTextNode(bits[i]));
      }
    }
  }
  return domNode;
}

/**
 * take a list of users and draw a whois online list
 */
function chatroomUpdateChatOnlineList(updateUsers) {
  var usersToDelete = [];
  var deleteFlag = true;

  // loop through the user list
  for (var i = 0; i < chatroom.userList.length; i++) {

    deleteFlag = true;
    for (var j = 0; j < updateUsers.length; j++) {      
      // if the user in the browser list is in the list from the server
      if (chatroom.userList[i].sessionId == updateUsers[j].sessionId) {
        // then we don't want to delete them 
        deleteFlag = false;
        updateUsers[j].noAdd = 1;

        // if their status in the browser is different than the update
        if (chatroom.userList[i].away != updateUsers[j].away) {
          if (updateUsers[j].away) {
            // set them as away onscreen
            addClass($(updateUsers[j].sessionId), 'chatroom-user-away');
            if (chatroom.sessionId !=  updateUsers[j].sessionId) {
              chatroomWriteSystemMsg(updateUsers[j].user, 'away');
            }
          }
          else {
            // set them as back on screen
            removeClass($(updateUsers[j].sessionId), 'chatroom-user-away');
            if (chatroom.sessionId !=  updateUsers[j].sessionId) {
              chatroomWriteSystemMsg(updateUsers[j].user, 'back');
            }
          }
          // update the browser list away setting
          chatroom.userList[i].away = updateUsers[j].away;
        }
      }
    }
    if (deleteFlag) {
      usersToDelete.push([i, chatroom.userList[i].user]);
    }
  }

  // delete the flagged users
  for (var i = 0; i < usersToDelete.length; i++) {
    // if the user to delete is the current user, kick them out
    if (chatroom.userList[usersToDelete[i][0]].sessionId == chatroom.sessionId) {
      chatroomKickUser();
      return;
    }
    $('chatroom-online').removeChild($(chatroom.userList[usersToDelete[i][0]].sessionId));
    chatroom.userList.splice(usersToDelete[i][0], 1);
    chatroomWriteSystemMsg(usersToDelete[i][1], 'leave');
  }

  // add the users who are not in the browser list, but where in the update list
  for (var i = 0; i < updateUsers.length; i++) {
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
        userInfo.setAttribute('href', 'javascript:chatroomSelectUser("' + updateUsers[i].user + '")');
        userInfo.style.color = chatroomGetUserColour(updateUsers[i].user);
      }
      li.style.fontWeight = 'bold';
      li.style.color = chatroomGetUserColour(updateUsers[i].user);
      li.appendChild(userInfo);      
      if (updateUsers[i].away) {
        addClass(li, 'chatroom-user-away');
      }
      $('chatroom-online').appendChild(li);          
      chatroomWriteSystemMsg(updateUsers[i].user, 'join');
    }
  }
}

/**
 * select a user to send a private message
 * To do: Figure out how to set focus after text on IE
 */
function chatroomSelectUser(userName) {
  $('chatroom-msg-input').value = userName + ', ';
  $('chatroom-msg-input').focus();
}

/**
 * writes a system message to the chat
 */
function chatroomWriteSystemMsg(msgText, type) {
  switch (type) {
    case 'join':
      var msgClass = 'chatroom-system-join';
      var sysMsg   = ' has joined the chat';
    break;
    case 'leave':
      var msgClass = 'chatroom-system-leave';
      var sysMsg   = ' has left the chat';
    break;
    case 'away':
      var msgClass = 'chatroom-system-away';
      var sysMsg   = ' is away';
    break;
    case 'back':
      var msgClass = 'chatroom-system-back';
      var sysMsg   = ' is back';
    break;
  }
  var msgSpan = document.createElement('span');
  msgSpan.appendChild(document.createTextNode(msgText));
  addClass(msgSpan, msgClass);

  var p = document.createElement('p');
  p.appendChild(document.createTextNode('* '));
  p.appendChild(msgSpan);
  p.appendChild(document.createTextNode(sysMsg));
  addClass(p, 'chatroom-system-msg');

  var msgBoard = $('chatroom-board');
  msgBoard.appendChild(p);
  msgBoard.scrollTop = msgBoard.scrollHeight;

  chatroom.lastUser = '';        
}

/**
 * function that controls sets/clears chatroomWriteTime()'s timeout
 */
function chatroomSetWriteTime() {
  if (chatroom.writeMsgTimeId) {
    clearTimeout(chatroom.writeMsgTimeId);
  }
  chatroom.writeMsgTimeId = setTimeout('chatroomWriteTime()', chatroom.idleInterval);
}

/**
 * function that writes a time to board when idle
 */
function chatroomWriteTime() {
  var msgBoard = $('chatroom-board');
  var p = document.createElement('p');
  p.appendChild(document.createTextNode('* Sent at '+ chatroom.lastMsgTime));
  addClass(p, 'chatroom-time-msg');
  msgBoard.appendChild(p);
  msgBoard.scrollTop = msgBoard.scrollHeight;
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
  return HTTPPost(chatroomGetUrl('read'), chatroomMsgCallback, false, chatroomPrepareMsg({}));
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
  for (var i = 0; i < chatroom.userList.length; i++) {
    if (chatroom.userList[i].user == user) {
      if (typeof chatroom.userList[i].colour != 'undefined') {
        return chatroom.userList[i].colour;
      }
      while (1) {
        var j = Math.round(chatroom.userColours.length * Math.random());
        if (chatroom.userColours[j].unUsed) {
          chatroom.userColours[j].unUsed = false;
          chatroom.userList[i].colour = chatroom.userColours[j].colour;
          return chatroom.userList[i].colour;
        }
      }
    }
  }
  return '#000000';
}

/**
 * sets initial users' colours
 */
function chatroomSetUserColours() {
  if ($('chatroom-online')) {
    for (var i = 0; i < chatroom.userList.length; i++) {
      if (chatroom.userList[i].uid == 0) {
        var userInfo = $(chatroom.userList[i].sessionId);
      }
      else {
        var userInfo = $(chatroom.userList[i].sessionId).getElementsByTagName('a')[0];
      }
      userInfo.style.color = chatroomGetUserColour(chatroom.userList[i].user);
      userInfo.style.fontWeight = 'bold';
    }
  }
}

/**
 * loads chatroomColours with some dark hex values
 */
function chatroomLoadHexColours() {
  var hex = ['00', '33', '66', '99', 'CC', 'FF'];
  for (var i = 0; i < hex.length; i++) {
    for (var j = 0; j < hex.length; j++) {
      for (var k = 0; k < hex.length; k++) {
        if ((3 + i + j + k) < 8) {
          chatroom.userColours[chatroom.userColours.length] = {colour:'#' + hex[i] + hex[j] + hex[k], unUsed:true};    
        }
      }
    }
  }
}

/**
 * onclick smileys insertion
 */
function chatroomSmileyInsert(acronym) {  
  $('chatroom-msg-input').value += (' ' + acronym);
  $('chatroom-msg-input').focus();
}

/**
 * toggle away status
 */
function chatroomSetAway(obj){
  if (obj.checked) {
    var msg = chatroomGetCommandMsg('/away');
  } 
  else {
    var msg = chatroomGetCommandMsg('/back');
  }
  HTTPPost(chatroomGetUrl('write'), chatroomMsgCallback, false, chatroomPrepareMsg(msg));
}

// Global Killswitch
if (isJsEnabled()) {
  addLoadEvent(chatroomAddEvents);
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
