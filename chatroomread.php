<?php
/**
 * @file handles ajax requests to check for new messages in a given chat
 */

// if anything is not right, just die
if (!isset($_GET['timestamp'])    ||
    !isset($_GET['chat_id'])      ||
    !isset($_GET['update_count']) ||
    !isset($_GET['last_msg_id'])  ||
    !preg_match('/^\d+$/', $_GET['timestamp'])    || 
    !preg_match('/^\d+$/', $_GET['chat_id'])      ||
    !preg_match('/^\d+$/', $_GET['update_count']) ||
    !preg_match('/^\d+$/', $_GET['last_msg_id']))  { 
  echo '/** UR3l33t! **/';
  exit;
} 

// need to get the path from the webroot, so that multi-site installs work
if ($_SERVER['PHP_SELF'] == '/chatroom.php') {
  $site_path = '';
}
else {
  $site_path = substr($_SERVER['PHP_SELF'], 1, strlen('/chatroom.php'));
  $site_path = str_replace(array('/', '.', ' '), array('_', '_', '-'), $site_path) .'_';
}

// get the query values we're interested in
$browser_timestamp = $_GET['timestamp'];
$update_count      = $_GET['update_count'];
$chat_id           = $_GET['chat_id'];
$last_msg_id       = $_GET['last_msg_id'];

// setup path to file
$cache_file = './modules/chatroom/chat_cache/'. $site_path . 'chat_' . $chat_id;
//echo "/** $cache_file **/";

// compare the cache files timestamp to the browsers timestamp
if (@file_exists($cache_file)) {
  if (($browser_timestamp - 1) >= @filemtime($cache_file)) {
    // cache hit, just send the empty array response and die
    header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
    header("Cache-Control: no-store, no-cache, must-revalidate");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    echo '[[],[]]';
    exit;
  }
}

// cache miss, so bootstrap drupal
require_once './includes/bootstrap.inc';
drupal_bootstrap(DRUPAL_BOOTSTRAP_PATH);

// invoke the chatroom read messages code and exit
module_invoke('chatroom', 'chat_read_msgs_cache', $chat_id, $last_msg_id, $update_count);
exit;

/* vim: set expandtab tabstop=2 shiftwidth=2 autoindent smartindent: */
?>
