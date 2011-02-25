<?php

/**
 * @file
 * Functions for updating a chat window.
 */

/**
 * Write a message into a chat.
 */
function chatroom_chat_write_msg($chat_id, $last_msg_id, $update_count, $cache_file, $msg, $recipient = NULL, $type = NULL, $timezone = 0, $smileys = FALSE) {
  global $user;
  $guest_id = chatroom_chat_is_registered_user($chat_id);
  if ($guest_id === FALSE) {
    $js->chatUsers = array();
  }
  else {
    if ($type == 'away' || $type == 'back') {
      db_query("
        UPDATE {chatroom_online_list} SET away = %d WHERE ccid = %d AND session_id = '%s'
      ", $type == 'away', $chat_id, session_id());
      chatroom_chat_update_online_time($chat_id);
    }
    else {
      db_query("
        UPDATE {chatroom_online_list} SET away = 0 WHERE ccid = %d AND session_id = '%s'
      ", $chat_id, session_id());
      db_query("
        INSERT INTO {chatroom_msg}
        (ccid, uid, msg_type, msg, session_id, recipient, modified)
        VALUES (%d, %d, '%s', '%s', '%s', '%s', %d)
      ", $chat_id, $user->uid, $type, $msg, session_id(), $recipient, time());
    }
    $js->msgs = chatroom_chat_get_latest_msgs($chat_id, $user->uid, $last_msg_id, $timezone, $smileys);
    $cache_timestamp  = @filemtime($cache_file);
    $js->chatUsers = chatroom_chat_get_online_list($chat_id, $cache_timestamp, $update_count);
    $cache_timestamp = chatroom_chat_update_cache($cache_file);
    if (!empty($cache_timestamp)) {
      $js->cacheTimestamp = $cache_timestamp;
    }
  }
  return chatroom_send_ajax_response(drupal_to_js($js));
}

/**
 * Kick a user out of a chat.
 */
function chatroom_chat_kick_user($chat_id, $guest_id, $cache_file) {
  if (user_access('administer chats')) {
    db_query("DELETE FROM {chatroom_online_list} WHERE ccid = %d AND guest_id = %d", $chat_id, $guest_id);
  }
  $cache_timestamp = @filemtime($cache_file);
  $js->chatUsers = chatroom_chat_get_online_list($chat_id, $cache_timestamp);
  $cache_timestamp = chatroom_chat_update_cache($cache_file);
  if (!empty($cache_timestamp)) {
    $js->cacheTimestamp = $cache_timestamp;
  }
  return chatroom_send_ajax_response(drupal_to_js($js));
}

/**
 * Ban a user from a chat room.
 */
function chatroom_ban_user($chat_id, $guest_id, $uid, $admin_uid, $cache_file) {
  if (user_access('administer chats')) {
    db_query("DELETE FROM {chatroom_online_list} WHERE ccid = %d AND guest_id = '%s'", $chat_id, $guest_id);
    $chat = chatroom_chat_get_from_id($chat_id, FALSE);
    db_query("INSERT INTO {chatroom_ban_list} (crid, uid, admin_uid) VALUES (%d, %d, %d)", $chat->crid, $uid, $admin_id);
  }
  $cache_timestamp = @filemtime($cache_file);
  $js->chatUsers = chatroom_chat_get_online_list($chat_id, $cache_timestamp);
  $cache_timestamp = chatroom_chat_update_cache($cache_file);
  if (!empty($cache_timestamp)) {
    $js->cacheTimestamp = $cache_timestamp;
  }
  return chatroom_send_ajax_response(drupal_to_js($js));
}

/**
 * Read info about a chat.
 */
function chatroom_chat_read_msgs($chat_id, $last_msg_id, $update_count, $cache_file, $timezone = 0, $smileys = FALSE) {
  global $user;
  $guest_id = chatroom_chat_is_registered_user($chat_id);
  if ($guest_id === FALSE) {
    $js->chatUsers = array();
  }
  else {
    chatroom_chat_update_online_time($chat_id);
    $js->msgs = chatroom_chat_get_latest_msgs($chat_id, $user->uid, $last_msg_id, $timezone, $smileys);
    $cache_timestamp = @filemtime($cache_file);
    $js->chatUsers = chatroom_chat_get_online_list($chat_id, $cache_timestamp, $update_count);
    if (!empty($cache_timestamp)) {
      $js->cacheTimestamp = $cache_timestamp;
    }
  }
  return chatroom_send_ajax_response(drupal_to_js($js));
}

/**
 * Check if the user is registered in this chat.
 */
function chatroom_chat_is_registered_user($chat_id) {
  $guest_id = FALSE;
  $archived = db_result(db_query("SELECT when_archived FROM {chatroom_chat} WHERE ccid = %d", $chat_id));
  if (!isset($archived)) {
    $sql = "SELECT guest_id FROM {chatroom_online_list} WHERE ccid = %d AND session_id = '%s'";
    $guest_id = db_result(db_query_range($sql, $chat_id, session_id(), 0, 1));
  }
  return $guest_id;
}

/**
 * Update an active chat rooms block.
 */
function chatroom_block_room_update($cache_file) {
  $rooms = chatroom_get_chatroom_list(FALSE, 0, _chatroom_variable_get('chatroom_block_chat_rooms', 5), FALSE);
  if (!empty($rooms)) {
    foreach ($rooms as $room) {
      $js[] = array(
        'chatroomName' => $room->title,
        'chatroomListId' => 'chatroom_'. $room->nid,
        'nid' => $room->nid,
      );
    }
  }
  $js[] = @filemtime($cache_file);
  return $js;
}

/**
 * Update an active chats block.
 */
function chatroom_block_chat_update($cache_file) {
  $chats = chatroom_get_active_chats(0, _chatroom_variable_get('chatroom_block_chats', 5), FALSE);
  if (!empty($chats)) {
    foreach ($chats as $chat) {
      $js[] = array(
        'chatName' => $chat->chatname,
        'chatListId' => 'chat_'. $chat->ccid,
        'ccid' => $chat->ccid,
        'roomName' => $chat->room_name,
        'nid' => $chat->nid,
      );
    }
  }
  $js[] = @filemtime($cache_file);
  return $js;
}

/**
 * Update an online user list block.
 */
function chatroom_block_online_list_update($uid) {
  chatroom_site_update_online_time($uid);
  $users = chatroom_get_site_online_list($uid);
  $js = array();
  if (!empty($users)) {
    foreach ($users as $user) {
      $js[] = array(
        'user' => $user->name,
        'uid' => $user->uid,
      );
    }
  }
  return $js;
}

/**
 * Send AJAX response.
 */
function chatroom_send_ajax_response($response) {
  header('Content-Type: text/html; charset=utf-8');
  header("Last-Modified: ". gmdate("D, d M Y H:i:s") ." GMT");
  header("Cache-Control: no-store, no-cache, must-revalidate");
  header("Cache-Control: post-check=0, pre-check=0", false);
  header("Pragma: no-cache");
  return $response;
}

/**
 * Set up smileys.
 */
function chatroom_smileys($smileys_base) {
  $smileys = FALSE;
  // See if smileys directory is correct.
  if (
    is_dir($smileys_base) && // Is a directory
    (
      drupal_substr($smileys_base, 0, drupal_strlen('modules')) == 'modules' || // in the modules directory
      drupal_substr($smileys_base, 0, drupal_strlen('sites')) == 'sites' // or in the sites directory.
    ) &&
    strpos($smileys_base, '..') === FALSE // and path does not contain "..".
  ) {
    include "./$smileys_base/smileys.module";
    $smileys = TRUE;
  }
  return $smileys;
}

