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
      if (resArray[0].length) {
        var scroll = chatroomUpdateMsgList(resArray[0]);
        chatroom.nomgs_updates = 0;        
      }
      else{
        chatroom.nomgs_updates++;
        var noMsgUpdatesTime = (chatroom.nomgs_updates * (chatroom.updateInterval / 1000));
        if (noMsgUpdatesTime == 45) {
          chatroomWriteTime();          
        }
      }
      if (resArray[1].length) {
        chatroomUpdateChatOnlineList(resArray[1]);
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
  if (text.search(/^\/(me|away|msg|back)/) != -1) {
    return chatroomSendCommand(text);
  }
  else if (text == '' || text.match(/^\s+$/)) {
    $('chatroom-msg-input').value = '';
    $('chatroom-msg-input').focus();
    return;
  }
  var msg = {chatroomMsg:text};
  $('chatroom-msg-input').value = '';
  $('chatroom-msg-input').focus();
  chatroom.skipUpdate = true;
  chatroom.updateCount++;
  if (chatroom.smileysBase) {
    msg.smileys_base = chatroom.smileysBase;
  }
  msg.chatroom_base = chatroom.chatroomBase;
  msg.user_base     = chatroom.userBase;
  msg.chatroomMsg   = msg.chatroomMsg;
  msg.chat_id       = chatroom.chatId;
  msg.last_msg_id   = chatroom.lastMsgId;
  msg.timezone      = chatroom.timezone;
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
      for (var i = 0; i < chatroom.userList.length; i++) {
        if (chatroom.userList[i].user == user) {
          var msg = {chatroomMsg:encodeURIComponent(args.join(' '))};
          if (chatroom.smileysBase) {
            msg.smileys_base = chatroom.smileysBase;
          }
          msg.recipient   = chatroom.userList[i].sessionId;
          msg.timezone    = chatroom.timezone;
        }
      }
      break;

    case 'me':
      if (args.length == 0) {
        return;
      }
      else {
        var msg = {chatroomMsg:encodeURIComponent(args.join(' '))};
        if (chatroom.smileysBase) {
          msg.smileys_base = chatroom.smileysBase;
        }
        msg.timezone    = chatroom.timezone;
        msg.type        = 'me';
      }
      break;

    case 'away':
    case 'back':
        var msg = {chatroomMsg:' '};
        msg.type = cmd;
      break;
  }
  msg.chatroom_base = chatroom.chatroomBase;
  msg.user_base     = chatroom.userBase;
  msg.chat_id       = chatroom.chatId;
  msg.last_msg_id   = chatroom.lastMsgId;
  return HTTPPost(chatroomGetUrl('write'), chatroomMsgCallback, false, msg);
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
        addClass(p, 'chatroom-old-msg');        
      }
      else if (msgs[i].type == 'me') {
        addClass(p, 'chatroom-me-msg');
      }
      else {
        addClass(p, 'chatroom-msg');
        p.style.color = chatroomGetUserColour(msgs[i].user);        
      }

      if (msgs[i].recipient) {
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
        p.appendChild(document.createTextNode('* ' + msgs[i].user + ' '));          
        chatroom.lastUser = '';        
      }
      else {             
        if (msgs[i].user != chatroom.lastUser) {
          var span = document.createElement('span');
          addClass(span, 'header');
          span.appendChild(document.createTextNode(msgs[i].user + ':'));               
          p.appendChild(span);              
        } 
        else {
          var span = document.createElement('span');
          addClass(span, 'indent');
          p.appendChild(span);
        }                
      }      
      p = chatroomProcessMsgText(p, msgs[i].text);
      msgBoard.appendChild(p);
      chatroom.lastUser    = msgs[i].user;
      chatroom.lastMsgTime = msgs[i].time;
      scroll = true;      
    }    
  }  
  if (chatroom.updateCount == 1) {
    chatroom.lastUser = '';
  }
  return scroll;
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
  var usersToDelete = Array();
  var deleteFlag = true;
  var count = 0;
  for (var i = 0; i < chatroom.userList.length; i++) {
    deleteFlag = true;
    for (var j = 0; j < updateUsers.length; j++) {
      if (chatroom.userList[i].sessionId == updateUsers[j].sessionId) {
        deleteFlag = false;
        updateUsers[j].noAdd = 1;
        if (chatroom.userList[i].away != updateUsers[j].away) {
          if (updateUsers[j].away) {
            addClass($(updateUsers[j].sessionId), 'chatroom-user-away');
            if (chatroom.sessionId !=  updateUsers[j].sessionId) {
              chatroomWriteSystemMsg(updateUsers[j].user, 'away');
            }
          }
          else {
            removeClass($(updateUsers[j].sessionId), 'chatroom-user-away');
            if (chatroom.sessionId !=  updateUsers[j].sessionId) {
              chatroomWriteSystemMsg(updateUsers[j].user, 'back');
            }
          }
          chatroom.userList[i].away = updateUsers[j].away;
        }
      }
    }
    if (deleteFlag) {
      usersToDelete.push([i, chatroom.userList[i].user]);
    }
  }
  for (var i = 0; i < usersToDelete.length; i++) {
    $('chatroom-online').removeChild($(chatroom.userList[usersToDelete[i][0]].sessionId));
    chatroom.userList.splice(usersToDelete[i][0], 1);
    chatroomWriteSystemMsg(usersToDelete[i][1], 'leave');
  }
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
 * writes last msg's time to the chat when iddle
 */
function chatroomWriteTime(msgText) {
  var msgBoard = $('chatroom-board');
  var p = document.createElement('p');
  p.appendChild(document.createTextNode('* Sent at '+ chatroom.lastMsgTime));
  addClass(p, 'chatroom-time-msg');
  msgBoard.appendChild(p);
  msgBoard.scrollTop = msgBoard.scrollHeight;
  chatroom.lastUser = '';    
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
  postData.last_msg_id   = chatroom.lastMsgId;
  postData.timestamp     = chatroom.cacheTimestamp;
  postData.update_count  = ++chatroom.updateCount;  
  postData.chatroom_base = chatroom.chatroomBase;
  postData.user_base     = chatroom.userBase;
  if (chatroom.smileysBase) {
    postData.smileys_base = chatroom.smileysBase;
  }
  postData.chat_cache_file     = chatroom.chatCacheFile;
  postData.timezone            = chatroom.timezone;
  if (chatroom.onlineList) {
    postData.online_list = 1;
  }
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
  // the online list might block might not be enabled
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
  if(obj.checked){
    chatroomSendCommand('/away');
  } 
  else {
    chatroomSendCommand('/back');
  }
}

// Global Killswitch
if (isJsEnabled()) {
  addLoadEvent(chatroomAddEvents);
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
