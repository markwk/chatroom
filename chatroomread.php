<?php

/**
 * @file
 * Process HTTP update requests.
 */

chatroom_get_directories(); // Prevent responses to hacker attacks.
if (isset($_POST['chat_id'])) { // Is this a chat?
  echo chatroom_chat_update();
}
if (isset($_POST['block_update'])) { // Is this a block?
  echo chatroom_block_update();
}
exit;

/**
 * Check for errors in directories.
 */
function chatroom_get_directories() {
  if (!isset($_POST['drupal_base'])) { // Is Drupal root directory known?
    exit; // Suspicious; do not respond.
  }
  $drupal_base = urldecode($_POST['drupal_base']);
  if (
    !is_dir($drupal_base) || // Not a directory.
    strpos($drupal_base, '..') !== FALSE // Path contains "..".
  ) {
    exit; // Suspicious; do not respond.
  }
  chdir($drupal_base); // Switch to Drupal root directory.
  if (!isset($_POST['base_url'])) { // Is Drupal base url known?
    exit; // Suspicious; do not respond.
  }
  $base_url = urldecode($_POST['base_url']);
  if (
    strpos($base_url, '..') !== FALSE // Path contains "..".
  ) {
    exit; // Suspicious; do not respond.
  }
  if (!isset($_POST['chatroom_base'])) { // Is chat room directory known?
    exit; // Suspicious; do not respond.
  }
  $chatroom_base = urldecode($_POST['chatroom_base']);
  // See if chat room directory is correct.
  if (
    !is_dir($chatroom_base) || // Not a directory.
    !(
      substr($chatroom_base, 0, strlen('modules')) == 'modules' || // Not in the modules directory
      substr($chatroom_base, 0, strlen('sites')) == 'sites' // or in the sites directory.
    ) ||
    strpos($chatroom_base, '..') !== FALSE // Path contains "..".
  ) {
    exit; // Suspicious; do not respond.
  }
  if (!isset($_POST['user_base'])) { // Is user directory known?
    exit; // Suspicious; do not respond.
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
    exit; // Suspicious; do not respond.
  }
  return;
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
    exit; // Suspicious; do not respond.
  }
  // If we are not sending a message:
  if (!isset($_POST['chatroomMsg']) && !isset($_POST['type'])) {
    // Test variables for reading.
    if (
      !isset($_POST['timestamp']) ||
      !isset($_POST['update_count']) ||
      !preg_match('/^\d+$/', $_POST['timestamp']) ||
      !preg_match('/^\d+$/', $_POST['update_count'])
    ) {
      exit; // Suspicious; do not respond.
    }
    // See if there have been new messages since our last update.
    $chat_cache_file = urldecode($_POST['chat_cache_file']);
    $time = time();
    if (
      @file_exists($chat_cache_file) && // Cache file exists
      $_POST['timestamp'] == @filemtime($chat_cache_file) && // and timestamp has not changed.
      $time > $_POST['timestamp'] + 10 // It has been more than ten seconds since last new message.
    ) {
      if ($time - $_POST['timestamp'] > 300) {
        @touch($chat_cache_file);
      }
      else {
        return;
      }
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
    exit; // Suspicious; do not respond.
  }
  // Start Drupal.
  chatroom_bootstrap();
  // Set variables.
  $chat_id = $_POST['chat_id'];
  $last_msg_id = $_POST['last_msg_id'];
  $update_count = $_POST['update_count'];
  $chat_cache_file = urldecode($_POST['chat_cache_file']);
  $recipient = empty($_POST['recipient']) ? '' : $_POST['recipient'];
  $type = empty($_POST['type']) ? 'msg' : $_POST['type'];
  $timezone = isset($_POST['timezone']) ? $_POST['timezone'] : 0;
  $smileys = isset($_POST['smileys_base']) ? chatroom_smileys(urldecode($_POST['smileys_base'])) : FALSE;
  // Are we writing?
  if (isset($_POST['chatroomMsg'])) {
    if (get_magic_quotes_gpc()) {
      $msg = check_plain(strip_tags(stripslashes(urldecode($_POST['chatroomMsg']))));
    }
    else {
      $msg = check_plain(strip_tags(urldecode($_POST['chatroomMsg'])));
    }
    return chatroom_chat_write_msg(
      $chat_id,
      $last_msg_id,
      $update_count,
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
      return chatroom_chat_kick_user($chat_id, $recipient, $chat_cache_file);
    }
    else if ($type == 'ban' && $recipient) {
      return chatroom_ban_user($chat_id, $recipient, $_POST['uid'], $_POST['admin_uid'], $chat_cache_file);
    }
    else {
      return chatroom_chat_read_msgs(
        $chat_id,
        $last_msg_id,
        $update_count,
        $chat_cache_file,
        $timezone,
        $smileys
      );
    }
  }
}

/**
 * Update blocks.
 */
function chatroom_block_update() {
  if (isset($_POST['room_cache_file'])) { // Is the chat rooms block enabled?
    $room_cache_file = urldecode($_POST['room_cache_file']);
    if (
      !@file_exists($room_cache_file) || // Cache file does not exist
      $_POST['room_timestamp'] < @filemtime($room_cache_file) // or timestamp has been updated.
    ) {
      chatroom_bootstrap();
      $js->chatroomList = chatroom_block_room_update($room_cache_file);
    }
  }
  if (isset($_POST['chat_cache_file'])) { // Is the active chats block enabled?
    $chat_cache_file = urldecode($_POST['chat_cache_file']);
    if (
      !@file_exists($chat_cache_file) || // Cache file does not exist
      $_POST['chat_timestamp'] < @filemtime($chat_cache_file) || // or timestamp has been updated
      time() < $_POST['chat_timestamp'] + 10 // or it has been less than ten seconds since last new message.
    ) {
      if (!isset($js)) {
        chatroom_bootstrap();
      }
      $js->chatList = chatroom_block_chat_update($chat_cache_file);
    }
  }
  if (isset($_POST['uid'])) { // Is the site-wide users block enabled?
    if (!isset($js)) {
      chatroom_bootstrap();
    }
    $js->userList = chatroom_block_online_list_update($_POST['uid']);
  }
  if (isset($js)) {
    return chatroom_send_ajax_response(drupal_to_js($js));
  }
  exit; // Suspicious; do not respond.
}

/**
 * Start Drupal.
 */
function chatroom_bootstrap() {
  $user_base = urldecode($_POST['user_base']);
  $chatroom_base = urldecode($_POST['chatroom_base']);
  require './includes/bootstrap.inc';
  require "./$user_base/user.module";
  require "./$chatroom_base/chatroom.module";
  require "./$chatroom_base/updates.inc";
  drupal_bootstrap(DRUPAL_BOOTSTRAP_CONFIGURATION);
  global $base_url;
  include './'. conf_path() .'/settings.php';
  $base_url = urldecode($_POST['base_url']);
  if (!empty($cookie_domain)) {
    $session_name = $cookie_domain;
  }
  else {
    list( , $session_name) = explode('://', $base_url, 2);
  }
  session_name('SESS'. md5($session_name));
  drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);
  return;
}

/**
 * Convert a PHP variable into its Javascript equivalent. Copied from
 * common.inc, which is only included in a full bootstrap of Drupal.
 */
function drupal_to_js($var) {
  switch (gettype($var)) {
    case 'boolean':
      return $var ? 'true' : 'false'; // Lowercase necessary!
    case 'integer':
    case 'double':
      return $var;
    case 'resource':
    case 'string':
      return '"'. str_replace(array("\r", "\n", "<", ">", "&"),
                              array('\r', '\n', '\x3c', '\x3e', '\x26'),
                              addslashes($var)) .'"';
    case 'array':
      // Arrays in JSON can't be associative. If the array is empty or if it
      // has sequential whole number keys starting with 0, it's not associative
      // so we can go ahead and convert it as an array.
      if (empty ($var) || array_keys($var) === range(0, sizeof($var) - 1)) {
        $output = array();
        foreach ($var as $v) {
          $output[] = drupal_to_js($v);
        }
        return '[ '. implode(', ', $output) .' ]';
      }
      // Otherwise, fall through to convert the array as an object.
    case 'object':
      $output = array();
      foreach ($var as $k => $v) {
        $output[] = drupal_to_js(strval($k)) .': '. drupal_to_js($v);
      }
      return '{ '. implode(', ', $output) .' }';
    default:
      return 'null';
  }
}


