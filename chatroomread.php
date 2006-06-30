<?php
/**
 * @file handles ajax requests to check for new messages in a given chat
 */

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
      !isset($_POST['cache_file'])                   ||
      !isset($_POST['update_count'])                 ||
      !preg_match('/^\d+$/', $_POST['timestamp'])    || 
      !preg_match('/^\d+$/', $_POST['update_count'])) {
    echo '/** UR3l33t! second **/';
    exit;
  } 
}

// if doesn't exist, or real path to module base doesn't start with 'modules', just exit
$module_base = urldecode($_POST['module_base']);
if (!$module_base || substr($module_base, 0, strlen('modules')) != 'modules') {
  echo "/** UR3l33t! module **/";
  exit;
}
else {
  $chatroom_module_file = "./$module_base/chatroom.module";
}

// get the request values we're interested in
$browser_timestamp = $_POST['timestamp'];
$update_count      = $_POST['update_count'];
$chat_id           = $_POST['chat_id'];
$last_msg_id       = $_POST['last_msg_id'];
$chat_cache_file   = $module_base .'/chat_cache/'. $_POST['cache_file'];

// are we just reading?
if ($write_request === false) {
  // yep, so see if we have a cache hit by comparing the timestamps
  if (@file_exists($chat_cache_file)) {
    if (($browser_timestamp - 1) >= @filemtime($chat_cache_file)) {
      // cache hit, just send the empty array response and die
      header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
      header("Cache-Control: no-store, no-cache, must-revalidate");
      header("Cache-Control: post-check=0, pre-check=0", false);
      header("Pragma: no-cache");
      echo "[[],[]] /** $browser_timestamp ". @filemtime($chat_cache_file) ." $chat_cache_file **/";
      exit;
    }
  }
}

// cache miss, so bootstrap drupal
require './includes/bootstrap.inc';
require './modules/user.module';
require $chatroom_module_file;
drupal_bootstrap(DRUPAL_BOOTSTRAP_SESSION);

// are we writing?
if ($write_request) {
  chatroom_chat_write_msg($chat_id, $last_msg_id, $update_count);
}
else {
  chatroom_chat_read_msgs($chat_id, $last_msg_id, $update_count);
}

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
?>
