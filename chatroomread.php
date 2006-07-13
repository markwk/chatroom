<?php
/**
 * @file handles ajax requests to check for new messages in a given chat
 */

/**
 * make sure we can get the chatroom module
 */
if (isset($_POST['module_base'])) {
  // if module base looks dodge, just exit
  $module_base = urldecode($_POST['module_base']);
  if (!is_dir($module_base)                                   ||
      substr($module_base, 0, strlen('modules')) != 'modules' ||
      strpos($module_base, '..') !== FALSE)                    {
    echo "/** UR3l33t! **/";
    exit;
  }
  else {
    $chatroom_module_file = "./$module_base/chatroom.module";
  }
}

/**
 * make sure we can get the smiley's module
 */
if (isset($_POST['smileys_base'])) {
  // if module base looks dodge, just exit
  $smileys_base = urldecode($_POST['smileys_base']);
  if (!is_dir($smileys_base)                                   ||
      substr($smileys_base, 0, strlen('modules')) != 'modules' ||
      strpos($smileys_base, '..') !== FALSE)                    {
    echo "/** UR3l33t! smiley **/";
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
  if (!isset($_POST['chat_id'])                     ||
      !isset($_POST['last_msg_id'])                 ||
      !isset($_POST['module_base'])                 ||
      !preg_match('/^\d+$/', $_POST['chat_id'])     ||
      !preg_match('/^\d+$/', $_POST['last_msg_id'])) {

    echo '/** UR3l33t! first **/';
    exit;
  }

  // if we are reading, we need to check a couple more request vars
  $write_request = empty($_POST['chatroomMsg']) ? false : true;
  if ($write_request === false) {
    if (!isset($_POST['timestamp'])                    ||
        !isset($_POST['chat_cache_file'])              ||
        !isset($_POST['update_count'])                 ||
        !preg_match('/^\d+$/', $_POST['timestamp'])    ||
        !preg_match('/^\d+$/', $_POST['update_count'])) {

      echo '/** UR3l33t! second **/';
      exit;
    }
  }

  // get the request values we're interested in
  $browser_timestamp = $_POST['chat_timestamp'];
  $update_count      = $_POST['update_count'];
  $chat_id           = $_POST['chat_id'];
  $last_msg_id       = $_POST['last_msg_id'];
  $chat_cache_file   = $module_base .'/chat_cache/'. $_POST['chat_cache_file'];
  $online_list       = isset($_POST['online_list']) ? true : false;
  $timezone          = isset($_POST['timezone']) ? $_POST['timezone'] : 0;

  if ($write_request === false) {

    // see if we have a cache hit by comparing the timestamps
    if (@file_exists($chat_cache_file)) {
      if (($browser_timestamp - 1) >= @filemtime($chat_cache_file)) {
        header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
        header("Cache-Control: no-store, no-cache, must-revalidate");
        header("Cache-Control: post-check=0, pre-check=0", false);
        header("Pragma: no-cache");
        echo '[[],[]]';
        exit;
      }
    }
  }

  // cache miss, so bootstrap drupal
  require './includes/bootstrap.inc';
  require './modules/user.module';
  require $chatroom_module_file;
  if ($smileys) {
    require $smileys_module_file;
  }
  drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);

  // are we writing?
  if ($write_request) {
    $msg       = strip_tags(htmlentities(urldecode($_POST['chatroomMsg']), ENT_NOQUOTES));
    $recipient = empty($_POST['recipient']) ? "" : $_POST['recipient'];
    $type      = is_null($_POST['type']) ? "msg" : $_POST['type'];
    chatroom_chat_write_msg($chat_id, $last_msg_id, $chat_cache_file, $msg, $recipient, $type, $timezone, $smileys);
  }
  else {
    chatroom_chat_read_msgs($chat_id, $last_msg_id, $update_count, $online_list, $timezone, $smileys);
  }
  exit;
}

/**
 * block request
 */
if (isset($_POST['block_update'])) {

  // see if we have a cache block cache hit
  $room_cache_hit = $chat_cache_hit = $user_cache_hit = true;
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

  // cache miss, so bootstrap drupal
  $room_js = $chat_js = '[]';
  if (!$chat_cache_hit || !$room_cache_hit) {
    require './includes/bootstrap.inc';
    require './modules/user.module';
    require $chatroom_module_file;
    drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);

    // get the js for the cache misses
    if (!$chat_cache_hit) {
      $chat_js = chatroom_block_chat_update_js($chat_cache_file);
    }
    if (!$room_cache_hit) {
      $room_js = chatroom_block_room_update_js($room_cache_file);
    }
  }

  header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
  header("Cache-Control: no-store, no-cache, must-revalidate");
  header("Cache-Control: post-check=0, pre-check=0", false);
  header("Pragma: no-cache");
  echo "[$chat_js, $room_js]";
  exit;
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
?>
