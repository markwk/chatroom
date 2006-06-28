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

// get the query values we're interested in
$browser_timestamp = $_GET['timestamp'];
$update_count      = $_GET['update_count'];
$chat_id           = $_GET['chat_id'];
$last_msg_id       = $_GET['last_msg_id'];

// setup path to file
require './includes/bootstrap.inc';
drupal_bootstrap(DRUPAL_BOOTSTRAP_DATABASE);
$chatroom_module = db_result(db_query("SELECT filename FROM {system} WHERE name = '%s' AND type = '%s'", 
                                      'chatroom', 'module'));
require $chatroom_module;
$cache_file = chatroom_get_cache_file_path($chat_id, dirname($chatroom_module));

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
      echo "[[],[]]";
      exit;
    }
  }
}

// cache miss, so bootstrap drupal
require './modules/user.module';
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
