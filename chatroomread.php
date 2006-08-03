<?php
/**
 * $Id$ 
 * @file handles ajax requests to check for new messages in a given chat
 */

/**
 * make sure we can get the chatroom module
 */
if (isset($_POST['chatroom_base'])) {
  // if module base looks dodge, just exit
  $chatroom_base = urldecode($_POST['chatroom_base']);
  $user_base     = urldecode($_POST['user_base']);
  if (!is_dir($chatroom_base)                                   ||
      !(substr($chatroom_base, 0, strlen('modules')) == 'modules' || substr($chatroom_base, 0, strlen('sites')) == 'sites')     ||
      strpos($chatroom_base, '..') !== FALSE                    || 
      !is_dir($user_base)                                       ||
      !(substr($user_base, 0, strlen('modules')) == 'modules' || substr($user_base, 0, strlen('sites')) == 'sites')     ||
      strpos($user_base, '..') !== FALSE)                        {
    echo "/** UR3l33t! 1 **/";
    exit;
  }
  else {
    $chatroom_module_file = "./$chatroom_base/chatroom.module";
    $user_module_file     = "./$user_base/user.module";
  }
}
else {
  echo "/** UR3l33t! 2 **/";
  exit;
}

/**
 * make sure we can get the smiley's module
 */
if (isset($_POST['smileys_base'])) {
  // if module base looks dodge, just exit
  $smileys_base = urldecode($_POST['smileys_base']);
  if (!is_dir($smileys_base)                                   ||
      !(substr($smileys_base, 0, strlen('modules')) == 'modules' || substr($smileys_base, 0, strlen('sites')) == 'sites') ||
      strpos($smileys_base, '..') !== FALSE)                    {
    echo "/** UR3l33t! 3 **/";
    exit;
  }
  else {
    $smileys_module_file = "./$smileys_base/smileys.module";
  }
}
$smileys = isset($smileys_module_file);

/**
 * chat request code
 */
if (isset($_POST['chat_id'])) {

  // if anything is not right, just die
  if (!isset($_POST['last_msg_id'])                 ||
      !preg_match('/^\d+$/', $_POST['chat_id'])     ||
      !preg_match('/^\d+$/', $_POST['last_msg_id'])) {

    echo '/** UR3l33t! 4 **/';
    exit;
  }

  // if we are reading, we need to check a couple more request vars
  $write_request = empty($_POST['chatroomMsg']) ? false : true;
  if ($write_request === false) {
    if (!isset($_POST['timestamp'])                    ||
        !isset($_POST['update_count'])                 ||
        !preg_match('/^\d+$/', $_POST['timestamp'])    ||
        !preg_match('/^\d+$/', $_POST['update_count'])) {

      echo '/** UR3l33t! 5 **/';
      exit;
    }
  }

  // get the request values we're interested in
  $browser_timestamp = $_POST['chat_timestamp'];
  $update_count      = $_POST['update_count'];
  $chat_id           = $_POST['chat_id'];
  $last_msg_id       = $_POST['last_msg_id'];
  $chat_cache_file   = $_POST['chat_cache_file'];
  $online_list       = isset($_POST['online_list']) ? true : false;
  $timezone          = isset($_POST['timezone']) ? $_POST['timezone'] : 0;

  if ($write_request === false) {
    // see if we have a cache hit by comparing the timestamps
    if (@file_exists($chat_cache_file)) {
      if (($browser_timestamp - 1) >= @filemtime($chat_cache_file)) {
        echo '/** 6 **/';
        exit;
      }
    }
  }

  // cache miss, so bootstrap drupal
  require './includes/bootstrap.inc';
  require $user_module_file;
  require $chatroom_module_file;
  if ($smileys) {
    require $smileys_module_file;
  }
  drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);

  $recipient = empty($_POST['recipient']) ? "" : $_POST['recipient'];
  $type      = is_null($_POST['type']) ? "msg" : $_POST['type'];

  if ($type == 'ban' && $recipient) {
    if (!isset($_POST['uid'])       || !preg_match('/^\d+$/', $_POST['uid'])       ||
        !isset($_POST['admin_uid']) || !preg_match('/^\d+$/', $_POST['admin_uid'])) { 
      echo '/** UR3l33T! 7 **/';
      exit;
    }
  }

  // are we writing?
  if ($write_request) {
    if (get_magic_quotes_gpc()) {
      $msg = strip_tags(stripslashes(urldecode($_POST['chatroomMsg'])));
    }
    else {
      $msg = strip_tags(urldecode($_POST['chatroomMsg']));
    }
    chatroom_chat_write_msg($chat_id, $last_msg_id, $chat_cache_file, $msg, $recipient, $type, $timezone, $smileys);
  }
  else {
    if ($type == 'kick' && $recipient) {
      chatroom_chat_kick_user($chat_id, $recipient);
    } 
    else if ($type == 'ban' && $recipient) {
      chatroom_ban_user($chat_id, $recipient, $_POST['uid'], $_POST['admin_uid']);
    } 
    else {
      chatroom_chat_read_msgs($chat_id, $last_msg_id, $update_count, $chat_cache_file, $online_list, $timezone, $smileys);
    }
  }
  exit;
}

/**
 * block request
 */
if (isset($_POST['block_update'])) {
  // see if we have a block cache hit
  $room_cache_hit = $chat_cache_hit = true;
  if (isset($_POST['room_cache_file'])) {
    $room_cache_file = urldecode($_POST['room_cache_file']);
    if (@file_exists($room_cache_file) && $_POST['room_timestamp'] < @filemtime($room_cache_file)) {
      $room_cache_hit = false;
    }
  }
  if (isset($_POST['chat_cache_file'])) {
    $chat_cache_file = urldecode($_POST['chat_cache_file']);
    if (@file_exists($chat_cache_file) && $_POST['chat_timestamp'] < @filemtime($chat_cache_file)) {
      $chat_cache_hit = false;
    }
  }
  if ($chat_cache_hit && $room_cache_hit && !isset($_POST['uid'])) {
    exit;
  }

  // cache miss, so bootstrap drupal
  $room_js = $chat_js = $user_js = '[]';
  require './includes/bootstrap.inc';
  require $user_module_file;
  require $chatroom_module_file;
  drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);

  // get the js for the cache misses
  if (!$chat_cache_hit) {
    $chat_js = chatroom_block_chat_update_js($chat_cache_file);
  }
  if (!$room_cache_hit) {
    $room_js = chatroom_block_room_update_js($room_cache_file);
  }
  if (isset($_POST['uid'])) {
    $user_js = chatroom_block_online_list_update_js($_POST['uid']);
  }

  header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
  header("Cache-Control: no-store, no-cache, must-revalidate");
  header("Cache-Control: post-check=0, pre-check=0", false);
  header("Pragma: no-cache");
  echo "[$chat_js, $room_js, $user_js]";
  exit;
}

/**
 * insert or accept invite requests
 */
if (isset($_POST['invite_uid']) || isset($_POST['invite_uid'])) {
  // get uid of the user who's sending this request
  if (isset($_POST['uid'])) {
    $uid = $_POST['uid'];
  } 
  else {
    exit;
  }

  $accept_uid = isset($_POST['accept_uid']) ? $_POST['accept_uid'] : null;
  $invite_uid = isset($_POST['invite_uid']) ? $_POST['invite_uid'] : null;
  require './includes/bootstrap.inc';
  require $user_module_file;
  require $chatroom_module_file;
  drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
?>
