// $Id$

/**
 * Client-side functionality for chatroom.module.
 *
 * Information about the chat is stored in one of three ways, depending on its
 * use:
 *  * Values that are useful to chatroom_js() in processing AHAH requests (ccid
 *    of the chat; nid of the parent chatroom, cmid of the latest message) are
 *    stored as form elements so that they are automatically submitted with any
 *    AHAH request.
 *  * Values that are static and only affect the client-side behaviour (e.g.
 *    update and polling intervals) are stored in Drupal.settings.chatroom. See
 *    the PHP function chatroom_add_js().
 *  * Actual display content is generated in functions called by
 *    theme('chatroom_chat') (on page load) and chatroom_js() (on updates).
 *    These are enclosed in <div>s with id attributes that trigger functions in
 *    Drupal.behaviors.
 *
 * TODO: smileys interface
 */

Drupal.chatroom = Drupal.chatroom || {};
Drupal.chatroom.chat = Drupal.chatroom.chat || {};

/**
 * Initialize the chat.
 *
 * The chat form is given the class 'chatroom-processed' when this behaviour
 * runs on page load, so that it is not triggered by AHAH requests.
 */
Drupal.behaviors.chatroom = function(context) {
  var retval = $('#chatroom-chat-form:not(.chatroom-processed)', context).addClass(
    'chatroom-processed').each(function() {
    // Alerts.
//    if ($('#edit-alerts')) {
//      soundManager.url = Drupal.settings.chatroom.sm2URL;
//      soundManager.waitForWindowLoad = true;
//      soundManager.onload = function() {
//        soundManager.createSound({
//         id: 'message',
//         url: Drupal.settings.chatroom.messageSound,
//         autoLoad: true,
//         autoPlay: false
//        });
//        soundManager.createSound({
//         id: 'user',
//         url: Drupal.settings.chatroom.userSound,
//         autoLoad: true,
//         autoPlay: false
//        });
//      }
//    }
    // Periodic updates.
    Drupal.chatroom.poll = setInterval("poll()", Drupal.settings.chatroom.pollInterval);
    idleReset();
    // Do not let the form submit unless some JavaScript code has set a control action.
    $(this).submit(function() {
      return $('#edit-control').html() != '';
    });
    // Actions that send a message.
    $('#edit-message', context).keypress(function(event) {
      if (event.keyCode == 13) {
        sendMessage();
      }
    });
    // Set a user as away.
    $('#edit-away', context).change(sendStatus);
    // Scroll to bottom of initial messages.
    var boardOffset = $('#chatroom-board').offset().top;
//    var targetOffset = $('div.chatroom-msg:last').offset().top;
 //   var scrollAmount = targetOffset - boardOffset;
 //   $('#chatroom-board').animate({scrollTop: '+='+ scrollAmount +'px'}, 500);
  });
  return true;
};

/**
 * Control.
 *
 * Updates <input type="hidden" id="edit-control" value="..."/> from
 * <div id="response-control">...</a>. The PHP function control_js() *always*
 * includes this element, so this behaviour is triggered on every request.
 */
Drupal.behaviors.chatroomControl = function(context) {
  var retval = $('#response-control', context).each(function() {
    $('#edit-control').val($(this).html());
    // Clean up any empty <div>s in the board (wrappers for previous requests).
    $('#chatroom-board div:empty').remove();
  }).remove();
  return true;
};

/**
 * Handle messages in AHAH response.
 *
 * Pulls new messages from <div id="response-messages">...</a>. See
 * http://www.learningjquery.com/2007/09/animated-scrolling-with-jquery-12 ,
 * specifically http://www.learningjquery.com/js/scroll-element.js
 */
Drupal.behaviors.chatroomMessages = function(context) {
  var retval = $('#response-messages', context).each(function() {
    // Only process if there's some actual content.
    if ($(this).html().length > 0) {
      // Tag the first new message and append to the display.
      $(this).children('.chatroom-msg:first').addClass('new-message');
      $('#chatroom-board').append($(this).html());
      // Scroll to first new message
      var boardOffset = $('#chatroom-board').offset().top;
      var targetOffset = $('div.new-message:last').offset().top;
      var scrollAmount = targetOffset - boardOffset;
      $('#chatroom-board').animate({scrollTop: '+='+ scrollAmount +'px'}, 500);
      $('.new-message').removeClass('new-message');
      // Play an alert
      if ($('#edit-alerts:checked')) {
//        soundManager.play('message');
      }
    }
   var afterProc = true;
  }).remove();
  return true;
};

/**
 * Latest message ID.
 *
 * Updates <input type="hidden" id="edit-last-cmid" value="..."/> from
 * <div id="response-last-cmid">...</a>. This is sent with each AHAH request so
 * messages are not fetched more than once.
 */
Drupal.behaviors.chatroomLastCmid = function(context) {
  retval = $('#response-last-cmid', context).each(function() {
    $('#edit-last-cmid').val($(this).html());
  }).remove();
  return true;
};

/**
 * Userlist
 */
Drupal.behaviors.chatroomUserList = function(context) {
  retval = $('#response-users', context).each(function() {
    $('#chatroom-user-list:first').replaceWith($(this).html());
  }).remove();
  return true;
};

/**
 * Poll for new information from the server.
 */
function poll() {
  // Don't poll while away
  if ($('#edit-away:checked').length == 0) {
    $('#edit-control').val('poll');
    // The AHAH-bound event for the submit button is 'mousedown', not 'click'.
    // See http://api.drupal.org/api/function/form_expand_ahah/6 . Don't poll
    // if a previous AHAH request is in progress.
    $('#edit-submit:not(.progress-disabled)').triggerHandler('mousedown');
  }
}

/**
 * Idle the user if no action is performed for a while.
 */
function idle() {
  $('#edit-away').checked = true;
}

/**
 * Return the user from away and set the idle timer.
 */
function idleReset() {
  $('#edit-away:checked').each(function() {
    this.checked = false;
  });
  if (Drupal.chatroom.idle) {
    clearInterval(Drupal.chatroom.idle);
  }
  Drupal.chatroom.idle = setInterval("idle()", Drupal.settings.chatroom.idleInterval);
}

/**
 * Trigger the actual AHAH request when the 'Send' button is pressed.
 */
function sendMessage() {
  if ($('#edit-submit.progress-disabled').length > 0) {
    // Wait for an ongoing AHAH request to complete.
    setTimeout("sendMessage()", 10);
  }
  else {
    idleReset();
    // Send the message.
    $('#edit-control').val('message');
    $('#edit-submit').triggerHandler('mousedown');
    // Clear the send box.
    $('#edit-message').val('');

  }
  // Prevent the event from bubbling.
  return false;
}

/**
 *
 */
function sendStatus(signal) {
  if ($('#edit-submit.progress-disabled').length > 0) {
    // Wait for an ongoing AHAH request to complete.
    setTimeout("sendStatus()", 10);
  }
  else {
    // Send the control message.
    $('#edit-control').val('status');
    $('#edit-submit').triggerHandler('mousedown');
  }
  // Prevent the event from bubbling.
  return false;
}

/**
 * function to add chatroom events handlers to the onscreen widgets
 */
Drupal.chatroom.chat.addEvents = function() {
  Drupal.chatroom.chat.setUserColours();
  $('#chatroom-msg-submit').click(
    function() {
      Drupal.chatroom.chat.sendMessage();
      return false;
    }
  );
  $('#chatroom-msg-away').click(
    function() {
      Drupal.chatroom.chat.setAway(this);
    }
  );
  $('#edit-submit').click(
    function() {
        alert('edit-submit pressed');
        Drupal.chatroom.chat.sendMessage();
        return false;
    }
  );
  $('#edit-submit').bind('mousedown', function(event) {
      alert('edit-submit mousedown');
  });
  
  for (var i = 0; i < Drupal.settings.chatroom.chatUsers.length; i++) {
    if (Drupal.settings.chatroom.chatUsers[i].self) {
      $('#chatroom-msg-away').attr('checked', Drupal.settings.chatroom.chatUsers[i].away);
    }
  }
  // Handling focus
  Drupal.settings.chatroom.pageTitle = document.title;
  Drupal.settings.chatroom.hasfocus = true;
  $(self).focus(
    function() {
      clearInterval(Drupal.settings.chatroom.warnInterval);
      Drupal.settings.chatroom.hasfocus = true;
      document.title = Drupal.settings.chatroom.pageTitle;
    }
  );
  $(self).blur(
    function() {
      Drupal.settings.chatroom.hasfocus = false;
    }
  );
  Drupal.chatroom.chat.getUpdates();
  Drupal.chatroom.chat.updates = setInterval("Drupal.chatroom.chat.getUpdates()", Drupal.settings.chatroom.chatUpdateInterval);

  return;
}

/**
 * get a command msg object
 *
Drupal.chatroom.chat.getCommandMsg = function(text) {
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
        msg.recipient = Drupal.chatroom.chat.findName(user).guestId;
      } while (!msg.recipient && args.length);

      // no one with this name in the chat
      if (!msg.recipient) {
        return false;
      }

      if (msg.type == 'ban') {
        msg.uid = Drupal.chatroom.chat.findGuestId(msg.recipient).uid;
        // can only ban Drupal users, not guests
        if (!msg.uid) {
          return false;
        }
        msg.admin_uid = Drupal.settings.chatroom.chatUsers[0].uid;
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
      $('#chatroom-msg-away').attr('checked', msg.type == 'away');
      msg.chatroomMsg = msg.type;
      return msg;
  }
}

/**
 * updates message list with response from server
 * To do: Move msgs formating to php so things like using t() can be done
 *
Drupal.chatroom.chat.updateMsgList = function(msgs) {
  var msgBoard = $('#chatroom-board');
  var scroll = false;
  var newMsgUser = false;
  for (var i = 0; i < msgs.length; i++) {
    if (Drupal.chatroom.chat.updateLastMsg(msgs[i].id)) {

      var p = $('<p>');

      if (Drupal.settings.chatroom.updateCount > 1) {
        // get the user for the first message
        if (newMsgUser == false) {
          newMsgUser = msgs[i].user;
        }
        // make sure the sender of this message is not set as away
        Drupal.chatroom.chat.setAsBack(msgs[i].user);

        if (msgs[i].type == 'me') {
          // * <username> msg - italicised
          p.addClass('chatroom-me-msg');
        }
        else {
          // normal msg
          p.addClass('chatroom-msg');
          p.css('color', Drupal.chatroom.chat.getUserColour(msgs[i].user));
        }
      }
      else {
        if (msgs[i].type == 'me') {
          // * <username> msg - italicised
          p.addClass('chatroom-old-me-msg');
        }
        else {
          // first load of page - greys out old msgs
          p.addClass('chatroom-old-msg');
        }
      }

      if (msgs[i].recipient) {
        // private msg
        var span = $('<span>');
        span.addClass('header');
        span.html(msgs[i].user);

        var privSpan = $('<span>');
        var recipient = Drupal.chatroom.chat.findGuestId(msgs[i].recipient);
        Drupal.settings.chatroom.chatUsers
        if (recipient && !recipient.self) {
          privSpan.html(' (privately to '+ recipient.user +')');
        }
        else {
          privSpan.html(' (privately)');
        }
        privSpan.addClass('chatroom-private');
        span.append(privSpan);
        span.append(':');
        p.append(span);
      }
      else if (msgs[i].type == 'me') {
        // * <username> msg
        p.append('<html>* '+ msgs[i].user +' </html>');
      }
      else {
        // normal msg
        if (msgs[i].user != Drupal.settings.chatroom.lastUser) {
          var span = $('<span>');
          span.addClass('header');
          span.append(msgs[i].user + ':');
          p.append(span);
        }
      }
      p = Drupal.chatroom.chat.addSmileys(p, msgs[i].text);

      // add to board
      msgBoard.append(p);
      Drupal.settings.chatroom.lastMsgTime = msgs[i].time;

      // checking identation
      if (msgs[i].recipient || msgs[i].type == 'me') {
      	Drupal.settings.chatroom.lastUser = '';
      }
      else {
      	Drupal.settings.chatroom.lastUser = msgs[i].user;
      }

      scroll = true;

      if ($('#chatroom-msg-alert').length > 0 && $('#chatroom-msg-alert').attr('checked')) {
        Drupal.chatroom.soundManager.play('message');
        if (Drupal.settings.chatroom.hasfocus == false) {
          Drupal.settings.chatroom.newMsgInfo = msgs[i].user +': '+ Drupal.chatroom.chat.removeSmileys(msgs[i].text);
          clearInterval(Drupal.settings.chatroom.warnInterval);
          Drupal.settings.chatroom.warnInterval = setInterval("Drupal.chatroom.chat.warnNewMsgLoop()", 1500);
        }
      }
    }
  }
  if (Drupal.settings.chatroom.updateCount == 1) {
    Drupal.settings.chatroom.lastUser = '';
  }
  else {
    Drupal.chatroom.chat.setWriteTime();
  }

  if (scroll) {
    msgBoard[0].scrollTop = msgBoard[0].scrollHeight;
  }

}

/**
 * take a list of users and draw a whois online list
 *
Drupal.chatroom.chat.updateChatUsers = function(chatUsers) {
  var chatUserList = $('#chatroom-online');
  if (chatUserList.length > 0) {
    // loop through the user list
    for (var i = 0; i < Drupal.settings.chatroom.chatUsers.length; i++) {
      deleteFlag = true;
      for (var j = 0; j < chatUsers.length; j++) {
        // if the user in the browser list is in the list from the server
        if (Drupal.settings.chatroom.chatUsers[i].guestId == chatUsers[j].guestId) {
          // then we don't want to delete them
          deleteFlag = false;
          // if their status in the browser is different than the update
          if (Drupal.settings.chatroom.chatUsers[i].away != chatUsers[j].away) {
            if (chatUsers[j].away) {
              // set them as away onscreen
              $('#' + chatUsers[j].guestId).addClass('chatroom-user-away');
              if (!chatUsers[j].self) {
                Drupal.chatroom.chat.writeSystemMsg(chatUsers[j].user, 'away');
              }
            }
            else {
              // set them as back on screen
              $('#' + chatUsers[j].guestId).removeClass('chatroom-user-away');
              if (!chatUsers[j].self) {
                Drupal.chatroom.chat.writeSystemMsg(chatUsers[j].user, 'back');
              }
            }
            // update the browser list away setting
            Drupal.settings.chatroom.chatUsers[i].away = chatUsers[j].away;
          }
          chatUsers.splice(j, 1);
        }
      }
      if (deleteFlag) {
        // if the user to delete is the current user, kick them out
        if (Drupal.settings.chatroom.chatUsers[i].self) {
          clearInterval(Drupal.chatroom.chat.updates);
          window.location = Drupal.settings.chatroom.kickUrl + Drupal.settings.chatroom.chatId;
          return;
        }
        $('#'+ Drupal.settings.chatroom.chatUsers[i].guestId).remove();
        Drupal.chatroom.chat.writeSystemMsg(Drupal.settings.chatroom.chatUsers[i].user, 'leave');
        Drupal.settings.chatroom.chatUsers.splice(i, 1);
      }
    }
    // add the users who are not in the browser list, but were in the update list
    for (var i = 0; i < chatUsers.length; i++) {
      Drupal.settings.chatroom.chatUsers.push(chatUsers[i]);
      var userInfo = $('<a>');
      userInfo.append(chatUsers[i].user);
      userInfo.attr('href', 'javascript:Drupal.chatroom.chat.selectUser("'+ chatUsers[i].user +'")');
      userInfo.css('color', Drupal.chatroom.chat.getUserColour(chatUsers[i].user));
      userInfo.css('fontWeight', 'bold');
      var li = $('<li>');
      li.attr('id', chatUsers[i].guestId);
      li.append(userInfo);
      if (chatUsers[i].away) {
        li.addClass('chatroom-user-away');
      }
      chatUserList.append(li);
      if (Drupal.settings.chatroom.updateCount > 10) {
        Drupal.chatroom.chat.writeSystemMsg(chatUsers[i].user, 'join');
      }
    }
  }
}

/**
 * Select a user to send a private message.
 *
Drupal.chatroom.chat.selectUser = function(userName) {
  var input = $('#chatroom-msg-input');
  input.val('/msg '+ userName + ' '+ input.val());
  input[0].focus();
  input[0].selectionStart = input.val().length;
}

/**
 * Write a system message to the chat.
 *
Drupal.chatroom.chat.writeSystemMsg = function(msgText, type) {
  switch (type) {
    case 'join':
      var msgClass = 'chatroom-system-join';
      var sysMsg = Drupal.settings.chatroom.joinMessage;
      if ($('#chatroom-user-alert').length > 0 && $('#chatroom-user-alert').attr('checked')) {
        Drupal.chatroom.soundManager.play('user');
        if (Drupal.settings.chatroom.hasfocus == false) {
          Drupal.settings.chatroom.newMsgInfo = msgText + sysMsg;
          clearInterval(Drupal.settings.chatroom.warnInterval);
          Drupal.settings.chatroom.warnInterval = setInterval("Drupal.chatroom.chat.warnNewMsgLoop()", 1500);
        }
      }
      break;
    case 'leave':
      var msgClass = 'chatroom-system-leave';
      var sysMsg = Drupal.settings.chatroom.leaveMessage;
        break;
    case 'away':
      var msgClass = 'chatroom-system-away';
      var sysMsg = Drupal.settings.chatroom.awayMessage;
      break;
    case 'back':
      var msgClass = 'chatroom-system-back';
      var sysMsg = Drupal.settings.chatroom.backMessage;
      break;
  }
  var msgSpan = $('<span>');
  msgSpan.append(msgText);
  msgSpan.addClass(msgClass);

  var p = $('<p>');
  p.append('<html>* </html>');
  p.append(msgSpan);
  p.append('<html>'+ sysMsg +'</html>');
  p.addClass('chatroom-system-msg');

  var msgBoard = $('#chatroom-board');
  msgBoard.append(p);
  msgBoard[0].scrollTop = msgBoard[0].scrollHeight;

  Drupal.settings.chatroom.lastUser = '';
}

/**
 * function that writes a time to board when idle
 *
Drupal.chatroom.chat.writeTime = function() {
  if (Drupal.settings.chatroom.lastMsgTime != undefined) {
    var msgBoard = $('#chatroom-board');
    var p = $('<p>');
    p.append(Drupal.settings.chatroom.lastMsgTime);
    p.addClass('chatroom-time-msg');
    msgBoard.append(p);
    msgBoard[0].scrollTop = msgBoard[0].scrollHeight;
    Drupal.settings.chatroom.lastUser = '';
    clearInterval(Drupal.settings.chatroom.warnInterval);
    document.title = Drupal.settings.chatroom.pageTitle;
  }
}

/**
 * Get the colour for a user.
 *
Drupal.chatroom.chat.getUserColour = function(user) {
  for (var i = 0; i < Drupal.settings.chatroom.chatUsers.length; i++) {
    if (Drupal.settings.chatroom.chatUsers[i].user == user) {
      if (Drupal.settings.chatroom.chatUsers[i].colour == undefined) {
        Drupal.settings.chatroom.chatUsers[i].colour = '#000000';
        while (1) {
          var j = Math.round((Drupal.settings.chatroom.userColours.length - 1) * Math.random());
          if (Drupal.settings.chatroom.userColours[j].unUsed) {
            Drupal.settings.chatroom.userColours[j].unUsed = false;
            Drupal.settings.chatroom.chatUsers[i].colour = Drupal.settings.chatroom.userColours[j].colour;
            break;
          }
        }
      }
      return Drupal.settings.chatroom.chatUsers[i].colour;
    }
  }
}

/**
 * Set colours for users.
 *
Drupal.chatroom.chat.setUserColours = function() {
  if ($('#chatroom-online').length > 0) {
    for (var i = 0; i < Drupal.settings.chatroom.chatUsers.length; i++) {
      var userInfo = $('a', $('#'+ Drupal.settings.chatroom.chatUsers[i].guestId));
      userInfo.css('color', Drupal.chatroom.chat.getUserColour(Drupal.settings.chatroom.chatUsers[i].user));
      userInfo.css('fontWeight', 'bold');
    }
  }
}

/**
 * onclick smileys insertion
 *
Drupal.chatroom.chat.smileyInsert = function(acronym) {
  var msgInput = $('#chatroom-msg-input');
  var text = msgInput.val();
  msgInput.val(text +' '+ acronym);
  msgInput[0].focus();
  msgInput[0].selectionStart = msgInput.val().length;
}

/**
 * toggle away status
 *
Drupal.chatroom.chat.setAway = function(obj) {
  if (obj.checked) {
    var msg = Drupal.chatroom.chat.getCommandMsg('/away');
  }
  else {
    var msg = Drupal.chatroom.chat.getCommandMsg('/back');
  }
  $.post(Drupal.chatroom.chat.getUrl('write'), Drupal.chatroom.chat.prepareMsg(msg), Drupal.chatroom.chat.msgCallback);
}

/**
 * Toggle message alert status.
 *
Drupal.chatroom.chat.setMsgAlerts = function(obj) {
  if ($(obj).attr('checked')) {
    Drupal.settings.chatroom.msgAlerts = true;
  }
  else {
    Drupal.settings.chatroom.msgAlerts = false;
  }
}

Drupal.chatroom.chat.warnNewMsgLoop = function() {
  if (document.title == Drupal.settings.chatroom.pageTitle) {
    document.title = Drupal.settings.chatroom.newMsgInfo;
  }
  else {
    document.title = Drupal.settings.chatroom.pageTitle;
  }
}
*/


