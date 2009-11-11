// $Id$

Drupal.chatroom = Drupal.chatroom || {};

/**
 * Add behaviours to chatroom elements.
 */
Drupal.behaviors.chatroom = function(context) {

  // This is the 'are there any new messages' polling.
  setInterval("Drupal.chatroom.poll()", Drupal.settings.chatroom.pollInterval * 1000);
  
  // Add behaviour to the 'send a message' field.
  $('#edit-chatroom-message-entry-box').keyup(function (e) {
    var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
    var messageText = $('#edit-chatroom-message-entry-box').val();
    if (key == 13) {
      if (messageText) {
        Drupal.chatroom.postMessage(messageText);
        $('#edit-chatroom-message-entry-box').val('');
      }
    }
  });
  if (Drupal.settings.chatroom.latestMsgId > 0) {
    var boardOffset = $('#chatroom-board').offset().top;
    var targetOffset = $('div.new-message:last').offset().top;
    var scrollAmount = targetOffset - boardOffset;
    $('#chatroom-board').animate({scrollTop: '+='+ scrollAmount +'px'}, 500);
    $('.new-message').removeClass('new-message');
  }

  Drupal.settings.chatroom.pageTitle = document.title;
  Drupal.settings.chatroom.hasFocus = true;
  $(self).focus(
    function() {
      clearInterval(Drupal.settings.chatroom.warnInterval);
      Drupal.settings.chatroom.hasFocus = true;
      document.title = Drupal.settings.chatroom.pageTitle;
    }
  );
  $(self).blur(
    function() {
      Drupal.settings.chatroom.hasFocus = false;
    }
  );

  // If this chat was configured as a popout, but we're not in a popout, load a 
  // popout from here, and redirect to a configured url which will set a 
  // message so the user knows what happened.
  if (opener == undefined && Drupal.settings.chatroom.viewAsPopout == 1) {
    Drupal.chatroom.loadPopout();
    window.location = Drupal.settings.basePath + Drupal.settings.chatroom.popoutRedirect + '/' + Drupal.settings.chatroom.chatId;
  }
};

Drupal.chatroom.loadPopout = function() {
  var popoutWindow;
  if (popoutWindow != null) {
    if (!popoutWindow.closed) {
      popoutWindow.focus();
    }
  }
  else {
    popoutWindow = open(location.href, '', Drupal.settings.chatroom.popoutParams);
  }
}

Drupal.chatroom.poll = function() {

  var skipCacheCheck = 0;
  if (Drupal.settings.chatroom.successiveCacheHits > Drupal.settings.chatroom.skipCacheCheckCount) {
    skipCacheCheck = 1;
  }
  
  $.ajax({
    type: 'POST',
    url: Drupal.settings.basePath + 'chatroomread.php',
    dataType: 'json',
    success: Drupal.chatroom.pollHandler,
    data: {
      latest_msg_id: Drupal.settings.chatroom.latestMsgId, 
      chat_cache_directory: Drupal.settings.chatroom.cacheDirectory, 
      chat_id: Drupal.settings.chatroom.chatId,
      skip_cache: skipCacheCheck,
      successive_cache_hits: Drupal.settings.chatroom.successiveCacheHits,
    } 
  });
};
 
Drupal.chatroom.pollHandler = function(response, responseStatus) {

  // If the user was kicked or banned, get the out of here.
  if (response.data.accessDenied) {
    window.location = Drupal.settings.basePath + Drupal.settings.chatroom.accessDeniedPath + '/' + Drupal.settings.chatroom.chatId + '/' + response.data.accessDenied;
  }

  // If the chat was archived, reload the page.
  if (response.data.archived) {
    window.location = Drupal.settings.basePath + Drupal.settings.chatroom.chatPath;
  }

  // If we hit the cache, then keep track of that. If the number of
  // successive cache hits gets high enough, we may want to signal to the
  // server that we should skip the cache check so that our online time
  // gets updated.
  if (response.data.cacheHit) {
    Drupal.settings.chatroom.successiveCacheHits++;
  }
  else {
    Drupal.settings.chatroom.successiveCacheHits = 0;
  }

  // Add any messages we haven't already seen to the board. Poll requests can 
  // pass each other over the wire, so we can't rely on getting a given
  // message once only.
  var newMessage = false;
  for (var i = 0; i < response.data.messages.length; i++) {   
    if (response.data.messages[i].cmid > Drupal.settings.chatroom.latestMsgId) {
      $('#chatroom-board').append(response.data.messages[i].html);
      Drupal.settings.chatroom.latestMsgId = response.data.messages[i].cmid;
      newMessage = response.data.messages[i];
    }
  }
  if (newMessage) {
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

  if (response.data.usersHtml) {
    $('#chatroom-user-list').replaceWith(response.data.usersHtml);
  }

  if (response.data.commandResponse) {
    Drupal.chatroom.addCommandMessage(response.data.commandResponse);
  }
};

Drupal.chatroom.addCommandMessage = function(response) {
  $('#chatroom-board').append('<div class="new-message command-message">** ' + response.msg + '</div>');
  var boardOffset = $('#chatroom-board').offset().top;
  var targetOffset = $('div.new-message:last').offset().top;
  var scrollAmount = targetOffset - boardOffset;
  $('#chatroom-board').animate({scrollTop: '+='+ scrollAmount +'px'}, 500);
  $('.new-message').removeClass('new-message');
}

Drupal.chatroom.postMessage = function(message) {
  $.ajax({
    type: 'POST',
    url: Drupal.settings.basePath + Drupal.settings.chatroom.postMessagePath + '/' + Drupal.settings.chatroom.chatId + '/' + Drupal.settings.chatroom.latestMsgId,
    dataType: 'json',
    success: Drupal.chatroom.pollHandler,
    data: { message: message } 
  })
}

/**
 * Toggle message alert status.
 */
Drupal.chatroom.setMsgAlerts = function(obj) {
  if ($(obj).attr('checked')) {
    Drupal.settings.chatroom.msgAlerts = true;
  }
  else {
    Drupal.settings.chatroom.msgAlerts = false;
  }
}

Drupal.chatroom.warnNewMsgLoop = function() {
  if (document.title == Drupal.settings.chatroom.pageTitle) {
    document.title = Drupal.settings.chatroom.newMsg.name + ' says: ' + Drupal.settings.chatroom.newMsg.text;
  }
  else {
    document.title = Drupal.settings.chatroom.pageTitle;
  }
}

// vi:ai:expandtab:sw=2 ts=2 

