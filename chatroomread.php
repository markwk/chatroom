<?php
/**
 * @file handles ajax requests to check for new messages in a given chat
 */

// if anything is not right, just die
if (!isset($_GET['chat_id'])      ||
    !isset($_GET['last_msg_id'])  ||
    !preg_match('/^\d+$/', $_GET['chat_id'])      ||
    !preg_match('/^\d+$/', $_GET['last_msg_id']))  { 
  echo '/** UR3l33t! **/';
  exit;
} 

// if we are reading, we need to check a couple more request vars
$write_request = empty($_POST['chatroomMsg']) ? false : true;
if ($write_request === false) {
  if (!isset($_GET['timestamp'])    ||
      !isset($_GET['update_count']) ||
      !preg_match('/^\d+$/', $_GET['timestamp'])    || 
      !preg_match('/^\d+$/', $_GET['update_count'])) {
    echo '/** UR3l33t! **/';
    exit;
  } 
}

// need to get the path from the webroot, so that multi-site installs work
if ($_SERVER['PHP_SELF'] == '/chatroomread.php') {
  $site_path = '';
}
else {
  $site_path = substr($_SERVER['PHP_SELF'], 1, -strlen('/chatroomread.php'));
  $file_site_path = str_replace(array('/', '.', ' '), array('_', '_', '-'), $site_path) .'_';
}

// get the query values we're interested in
$browser_timestamp = $_GET['timestamp'];
$update_count      = $_GET['update_count'];
$chat_id           = $_GET['chat_id'];
$last_msg_id       = $_GET['last_msg_id'];

// setup path to file
$cache_file = './modules/chatroom/chat_cache/'. $file_site_path .'chat_'. $chat_id;

// are we just reading?
if ($write_request === false) {
  // yep, so see if we have a cache hit by comparing the timestamps
  if (@file_exists($cache_file)) {
    if (($browser_timestamp - 1) >= @filemtime($cache_file)) {
      // cache hit, just send the empty array response and die
      header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
      header("Cache-Control: no-store, no-cache, must-revalidate");
      header("Cache-Control: post-check=0, pre-check=0", false);
      header("Pragma: no-cache");
      echo "[[],[]] /* $site_path {$_SERVER['PHP_SELF']} */";
      exit;
    }
  }
}

// cache miss, so bootstrap drupal
require './includes/bootstrap.inc';
require './modules/user.module';
require './modules/chatroom/chatroom.module';
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
