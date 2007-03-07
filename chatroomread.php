<?php
// $Id$

$errors = chatroom_get_errors();
if (empty($errors)) {
  if (isset($_POST['chat_id'])) { // Is this a chat?
    echo chatroom_chat_update();
  }
  if (isset($_POST['block_update'])) { // Is this a block?
    echo chatroom_block_update();
  }
}
else {
  echo $errors;
}
exit;

/**
 * Check for errors in directories.
 */
function chatroom_get_errors() {
  if (!isset($_POST['chatroom_base'])) { // Is current directory known?
    exit;
  }
  else {
    // Switch to Drupal root directory.
    $chatroom_base = urldecode($_POST['chatroom_base']);
    $depth = substr_count($chatroom_base, '/');
    chdir(str_repeat('../', $depth+1));
    // See if chat room directory is correct.
    if (
      !is_dir($chatroom_base) || // Not a directory.
      !(
        substr($chatroom_base, 0, strlen('modules')) == 'modules' || // Not in the modules directory
        substr($chatroom_base, 0, strlen('sites')) == 'sites' // or in the sites directory.
      ) ||
      strpos($chatroom_base, '..') !== FALSE // Path contains "..".
    ) {
      exit;
    }
    // See if user directory is correct.
    $user_base = urldecode($_POST['user_base']);
    if (
      !is_dir($user_base) || // Not a directory.
      !(
        substr($user_base, 0, strlen('modules')) == 'modules' || // Not in the modules directory
        substr($user_base, 0, strlen('sites')) == 'sites' // or in the sites directory.
      ) ||
      strpos($user_base, '..') !== FALSE // Path contains "..".
    ) {
      exit;
    }
    return;
  }
}

/**
 * Update the current chat.
 */
function chatroom_chat_update() {
  // Test message variables.
  if (
    !isset($_POST['last_msg_id']) ||
    !preg_match('/^\d+$/', $_POST['chat_id']) ||
    !preg_match('/^\d+$/', $_POST['last_msg_id'])
  ) {
    exit;
  }
  // If we are not sending a message:
  if (empty($_POST['chatroomMsg'])) {
    // Test variables for reading.
    if (
      !isset($_POST['timestamp']) ||
      !isset($_POST['update_count']) ||
      !preg_match('/^\d+$/', $_POST['timestamp']) ||
      !preg_match('/^\d+$/', $_POST['update_count'])
    ) {
      exit;
    }
    // See if there have been new messages since our last update.
    $chat_cache_file = urldecode($_POST['chat_cache_file']);
    if (
      @file_exists($chat_cache_file) && // Cache file exists
      $_POST['timestamp'] == @filemtime($chat_cache_file) && // and timestamp has not changed.
      time() > $_POST['timestamp'] + 10 // It has been more than ten seconds since last new message.
    ) {
      return;
    }
  }
  // If we are banning a user:
  if (
    (!empty($_POST['recipient']) && $_POST['type'] == 'ban') &&
    (
      !isset($_POST['uid']) || // User ID is missing.
      !preg_match('/^\d+$/', $_POST['uid']) ||
      !isset($_POST['admin_uid']) || // Administrator ID is missing.
      !preg_match('/^\d+$/', $_POST['admin_uid'])
    )
  ) {
    exit;
  }
  // Start Drupal.
  chatroom_bootstrap_drupal();
  // Set up smileys.
  if (isset($_POST['smileys_base'])) {
    $smileys_base = urldecode($_POST['smileys_base']);
    // See if smileys directory is correct.
    if (
      is_dir($smileys_base) && // Is a directory
      (
        substr($smileys_base, 0, strlen('modules')) == 'modules' || // in the modules directory
        substr($smileys_base, 0, strlen('sites')) == 'sites' // or in the sites directory.
      ) &&
      strpos($smileys_base, '..') == FALSE // and path does not contain "..".
    ) {
      $smileys = "./$smileys_base/smileys.module";
      include $smileys;
    }
  }
  // Set variables.
  $chat_id = $_POST['chat_id'];
  $last_msg_id = $_POST['last_msg_id'];
  $update_count = $_POST['update_count'];
  $chat_cache_file = urldecode($_POST['chat_cache_file']);
  $online_list = isset($_POST['online_list']) ? TRUE : FALSE;
  $recipient = empty($_POST['recipient']) ? '' : $_POST['recipient'];
  $type = empty($_POST['type']) ? 'msg' : $_POST['type'];
  $timezone = isset($_POST['timezone']) ? $_POST['timezone'] : 0;
  // Are we writing?
  if (!empty($_POST['chatroomMsg'])) {
    if (get_magic_quotes_gpc()) {
      $msg = strip_tags(stripslashes(urldecode($_POST['chatroomMsg'])));
    }
    else {
      $msg = strip_tags(urldecode($_POST['chatroomMsg']));
    }
    return chatroom_chat_write_msg(
      $chat_id,
      $last_msg_id,
      $chat_cache_file,
      $msg,
      $recipient,
      $type,
      $timezone,
      $smileys
    );
  }
  else {
    if ($type == 'kick' && $recipient) {
      return chatroom_chat_kick_user($chat_id, $recipient);
    }
    else if ($type == 'ban' && $recipient) {
      return chatroom_ban_user($chat_id, $recipient, $_POST['uid'], $_POST['admin_uid']);
    }
    else {
      return chatroom_chat_read_msgs(
        $chat_id,
        $last_msg_id,
        $update_count,
        $chat_cache_file,
        $online_list,
        $timezone,
        $smileys
      );
    }
  }
  return;
}

/**
 * Update blocks.
 */
function chatroom_block_update() {
  $room_js = $chat_js = $user_js = '[]';
  if (isset($_POST['room_cache_file'])) { // Is the chat rooms block enabled?
    $room_cache_file = urldecode($_POST['room_cache_file']);
    if (
      @file_exists($room_cache_file) && // Cache file exists
      $_POST['room_timestamp'] < @filemtime($room_cache_file) // and timestamp has been updated.
    ) {
      chatroom_bootstrap_drupal();
      $room_cache_file = urldecode($_POST['room_cache_file']);
      $room_js = chatroom_block_room_update_js($room_cache_file);
      $room = TRUE;
    }
  }
  if (isset($_POST['chat_cache_file'])) { // Is the active chats block enabled?
    $chat_cache_file = urldecode($_POST['chat_cache_file']);
    if (
      !@file_exists($chat_cache_file) || // Cache file does not exist
      $_POST['timestamp'] < @filemtime($chat_cache_file) || // or timestamp has been updated
      time() < $_POST['timestamp'] + 10 // or it has been less than ten seconds since last new message.
    ) {
      if (empty($room)) {
        chatroom_bootstrap_drupal();
      }
      $chat_cache_file = urldecode($_POST['chat_cache_file']);
      $chat_js = chatroom_block_chat_update_js($chat_cache_file);
      $chats = TRUE;
    }
  }
  if (isset($_POST['uid'])) { // Is the site-wide users block enabled?
    if (empty($room) && empty($chats)) {
      chatroom_bootstrap_drupal();
    }
    $user_js = chatroom_block_online_list_update_js($_POST['uid']);
  }
  return chatroom_send_ajax_response("[$chat_js, $room_js, $user_js]");
}

/**
 * Start Drupal.
 */
function chatroom_bootstrap_drupal() {
  $user_base = urldecode($_POST['user_base']);
  $chatroom_base = urldecode($_POST['chatroom_base']);
  require './includes/bootstrap.inc';
  require "./$user_base/user.module";
  require "./$chatroom_base/chatroom.module";
  drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);
  return;
}

