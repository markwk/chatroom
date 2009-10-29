// $Id$

Drupal.chatroom = Drupal.chatroom || {};

/**
 * Add behaviours to chatroom elements.
 */
Drupal.behaviors.chatroom = function(context) {
  
  // This is the 'are there any new messages' polling.
  setInterval("Drupal.chatroom.poll()", Drupal.settings.chatroom.pollInterval * 1000);
  
  // Add behaviour to the 'send a message' field.
  $('#chatroom-chat-message-submit').keyup(function (e) {
    var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
    var messageText = $('#chatroom-chat-message-submit').val();
    if (key == 13) {
      if (messageText) {
        Drupal.chatroom.postMessage(messageText);
        $('#chatroom-chat-message-submit').val('');
      }
    }
  });

  if (Drupal.settings.chatroom.latestMsgId == undefined) {
    Drupal.settings.chatroom.latestMsgId = 0;
  }
};

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
  for (var i = 0; i < response.data.messages.length; i++) {   
    if (response.data.messages[i].cmid > Drupal.settings.chatroom.latestMsgId) {
      $('#chatroom-board').append(response.data.messages[i].html);
      Drupal.settings.chatroom.latestMsgId = response.data.messages[i].cmid;
    }
  }

  if (response.data.usersHtml) {
    $('#chatroom-user-list').html(response.data.usersHtml);
  }
};

Drupal.chatroom.postMessage = function(message) {
  $.ajax({
    type: 'POST',
    url: Drupal.settings.basePath + Drupal.settings.chatroom.postMessagePath + '/' + Drupal.settings.chatroom.chatId + '/' + Drupal.settings.chatroom.latestMsgId,
    dataType: 'json',
    success: Drupal.chatroom.pollHandler,
    data: { message: message } 
  })
}

// vi:ai:expandtab:sw=2 ts=2 

