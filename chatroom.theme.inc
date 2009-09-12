<?php
// $Id$

/**
 * $file
 * Theme functions for chatroom.module.
 */

/**
 * Implementation of hook_theme().
 */
function chatroom_theme() {
  // Blocks provided by the module.
  $theme['chatroom_block_commands']   = array('arguments' => array());
  $theme['chatroom_block_chats']      = array('arguments' => array());
  $theme['chatroom_block_rooms']      = array('arguments' => array());
  $theme['chatroom_block_chat_list']  = array('arguments' => array());
  $theme['chatroom_block_site_list']  = array('arguments' => array());
  // Message theming for display in an active chat.
  $theme['chatroom_messages']         = array('arguments' => array('messages'));
  $theme['chatroom_message']          = array('arguments' => array('message'));
  // User list theming for display in an active chat.
  $theme['chatroom_user_list']        = array('arguments' => array('users'));
  // Information about the latest message, for use in a chat list.
  $theme['chatroom_last_message']     = array('arguments' => array('message'));
  $theme['chatroom_chat_kicked_user'] = array('arguments' => array('chat'));
  $theme['chatroom_chat_banned_user'] = array('arguments' => array('chat'));
  // List of all chatrooms.
  $theme['chatroom_display']          = array('arguments' => array('tree'));
  // List of chats in a chatroom.
  $theme['chatroom_list']             = array('arguments' => array('tree'));
  // Actual chats and archives.
  $theme['chatroom_chat']             = array('arguments' => array('chat'));
  $theme['chatroom_chat_archive']     = array('arguments' => array('chat'));
  return $theme;
}

/**
 * Theme the chat commands block.
 *
 * @ingroup themeable
 */
function theme_chatroom_block_commands() {
  $content = '/msg <em>'. t('username') .'</em> '. t('message');
  if (user_access('administer chats')) {
    $content .= '<br />/kick <em>'. t('username') .'</em>';
    $content .= '<br />/ban <em>'. t('username') .'</em>';
  }
  $content .= '<br />/me '. t('message');
  $content .= '<br />/away';
  $content .= '<br />/back';
  $block = array('content' => $content, 'subject' => t('Chat commands'));
  return $block;
}

/**
 * Theme the site-wide chat list block.
 *
 * @ingroup themeable
 */
function theme_chatroom_block_chats() {
  $content = '<ul class="menu" id="chatroom-sitewide-chats">';
  $chats = chatroom_get_active_chats(0, variable_get('chatroom_block_chats', 5));
  if ($chats) {
    foreach ($chats as $chat) {
      $chat_link = l($chat->chatname, "chatroom/chat/$chat->ccid");
      $room_link = l($chat->room_name, "node/$chat->nid");
      $content .= '<li id="chat_'. $chat->ccid .'">'. $chat_link .'<br />';
      $content .= '<span class="chatroomLink">'. t('in') .' '. $room_link .'</span></li>';
    }
  }
  else {
    $content .= '<li id="chat_empty"><em>'. t('There are no active chats.') .'</em></li>';
  }
  $content .= '</ul>';
  return array(
    'content' => $content,
    'subject' => t('Active chats'),
  );
}

/**
 * Theme the chat room list block.
 *
 * @ingroup themeable
 */
function theme_chatroom_block_rooms() {
  $content = '<ul class="menu" id="chatroom-sitewide-chatrooms">';
  $rooms = chatroom_get_room_list(FALSE, 0, variable_get('chatroom_block_chat_rooms', 5));
  if (empty($rooms)) {
    $content .= '<li id="chatroom_empty"><em>'. t('There are no active chat rooms.') .'</em></li>';
  }
  else {
    foreach ($rooms as $room) {
      $content .= '<li id="chatroom_'. $room->nid .'">'. l($room->title, "node/$room->nid") .'</li>';
    }
  }
  $content .= '</ul>';
  return array(
    'content' => $content,
    'subject' => t('Active chat rooms'),
  );
}

/**
 * Theme the block listing on-line users in the current chat.
 *
 * @ingroup themeable
 */
function theme_chatroom_block_chat_users() {
  $chat_id = $matches[1];
  $cache_file = _chatroom_get_cache_file("chat.$chat_id");
  $cache_timestamp = @filemtime($cache_file);
  $users = chatroom_chat_get_online_list($chat_id, $cache_timestamp, 0);
  $title = '';
  $content = '';
  if (!empty($users)) {
    $chatname = db_result(db_query("SELECT chatname FROM {chatroom_chat} WHERE ccid = %d", $chat_id));
    $title = t('Who is on line in %chat', array('%chat' => $chatname));
    $content = '<ul class="menu" id="chatroom-online">';
    foreach ($users as $user) {
      $content .= '<li id="'. $user['guestId'] .'"';
      $content .= $user['away'] ? ' class="chatroom-user-away">' : '>';
      $content .= '<a href="javascript:Drupal.chatroom.chat.selectUser(\''. $user['user'] .'\')">'. $user['user'] .'</a></li>';
    }
    $content .= '</ul>';
    if (variable_get('chatroom_alerts', FALSE)) {
      $checked = variable_get('chatroom_alerts_default', FALSE) ? ' checked' : '';
      $content .= '<div id="chatroom-user-options">';
      $content .= '<label><input type="checkbox"'. $checked .' id="chatroom-user-alert" /> ';
      $content .= t('Alert me if new users enter.') .'</label></div>';
    }
  }
  return array(
    'content' => $content,
    'subject' => $title,
  );
}

/**
 * Theme the block listing online users for the whole site.
 *
 * @ingroup themeable
 */
function theme_chatroom_block_site_users() {
  global $user;
  chatroom_site_update_online_time($user->uid);
  if ($users = chatroom_get_site_online_list($user->uid)) {
    foreach ($users as $chat_user) {
      $items[] = theme('username', $chat_user);
    }
    $content = str_replace('class="item-list"', 'class="item-list menu" id="chatroom-sitewide-online"', theme('item_list', $items));
  }
  else {
    $content = '<ul class="item-list menu" id="chatroom-sitewide-online"><li id="no_users"><em>'. t('There are no other users on line.') .'</em></li></ul>';
  }
  return array(
    'content' => $content,
    'subject' => t('On-line users'),
  );
}

/**
 * Format an array of messages.
 *
 * @ingroup themeable
 */
function theme_chatroom_messages($messages) {
  $output = '';
  if (is_array($messages)) {
    foreach($messages as $message) {
      $output .= theme('chatroom_message', $message);
    }
  }
  return $output;
}

/**
 * @ingroup themeable.
 */
function theme_chatroom_last_message() {}

/**
 * Format a single message for display.
 *
 * TODO: use a configurable format.
 *
 * @ingroup themeable
 */
function theme_chatroom_message($message) {
  $output = '<div class="chatroom-msg">';
  $output .= '<strong>'. $message->content['user'] .':</strong> ';
  $output .= $message->content['message'];
  $output .= '</div>';
  return $output;
}

/**
 * Format the list of users in a chatroom.
 *
 * @ingroup themeable
 */
function theme_chatroom_user_list($users) {
  if (!empty($users)) {
    foreach ($users as $user) {
      $items[] = theme('username', $user);
    }
  }
  $output = theme('item_list', $items);
  return str_replace('class="item-list"', 'id="chatroom-user-list" class="item-list"', $output);
}

/**
 * Format a message for display in a summary table.
 */
function theme_chatroom_latest($message) {
  if (function_exists('_smileys_list') && variable_get('chatroom_smileys_enabled', FALSE)) {
    $msg->msg = smileys_filter_process($message->msg);
  }
  $output = $message->msg .'<br />';
  $output .= t('Posted by <strong>!user</strong> on !date', array(
    '!user' => $message->uid ? l($message->name, "user/$message->uid") : variable_get('chatroom_guest_user_prefix', t('guest-')) . $message->guest_id,
    '!date' => format_date($message->modified, 'medium'),
  ));
  return $output;
}

/**
 * Format the chat room listing.
 *
 * @ingroup themeable
 */
function theme_chatroom_display($tree) {
  global $user;
  // chat room list, chats list, and 'add new chat' link

  if (!empty($tree)) {
    $output  = '<div id="chatroom">';
    $output .= '<ul>';

    if (user_access('create chat rooms')) {
      $output .= '<li>'. l(t('Post a new chat room.'), "node/add/chatroom") .'</li>';
    }
    else if ($user->uid) {
      //
    }
    else {
      $output .= '<li>'. t('<a href="!login">Login</a> to post a new chat room.', array('!login' => url('user/login'))) .'</li>';
    }
    $output .= '</ul>';
    $output .= theme('chatroom_list', $tree);
    $output .= '</div>';
  }
  else {
    drupal_set_title(t('No chat rooms defined'));
    $output = '';
  }

  return $output;
}

/**
 * Format the chat room table.
 *
 * @ingroup themeable
 */
function theme_chatroom_list($rooms) {
  global $user;

  if ($rooms) {
    $header = array(t('Chat room'), t('Chats'), t('Messages'), t('Last message'));
    foreach ($rooms as $room) {
      $description  = "<div>\n";
      $description .= ' <div class="name">'. l($room->title, "node/$room->nid") .'</div>';

      if ($room->body) {
        $description .= ' <div class="description">'. $room->body ."</div>\n";
      }
      $description .= "</div>\n";

      $rows[] = array(array('data' => $description, 'class' => 'container', 'colspan' => '4'));

      if (isset($room->chatroom->chats)) {
        foreach ($room->chatroom->chats as $id => $chat) {
          $description  = "<div>\n";
          if (isset($chat->when_archived)) {
            $description .= ' <div class="name">'. l($chat->chatname, "chatroom/archives/$chat->ccid") ."</div>\n";
          }
          else {
            $description .= ' <div class="name">'. l($chat->chatname, "chatroom/chat/$chat->ccid") ."</div>\n";
          }
          $description .= "</div>\n";

          $row[] = array('data' => '&nbsp;');
          $row[] = array('data' => $description, 'class' => 'chatroom-chat');
          $row[] = array('data' => $chat->msg_count, 'class' => 'chatroom-msg-count');
          $row[] = array('data' => $chat->msg_info, 'class' => 'chatrom-msg-info');
          $rows[] = $row;
          unset($row);
        }
      }
    }
    return theme('table', $header, $rows);
  }
}

/**
 * Get HTML for kick message.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat_kicked_user($chat) {
  $msg = $chat->kicked_out_message ? $chat->kicked_out_message : t('You have been kicked out of %chat for misbehaving.', array('%chat' => $chat->chatname));
  return '<div id="chatroom-kicked-msg">'. $msg .'</div>';
}

/**
 * Get HTML for ban message.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat_banned_user($chat) {
  $msg = $chat->banned_message ? $chat->banned_message : t('You have been banned from %chatroom.', array('%chatroom' => $chat->chatroom_name));
  return '<div id="chatroom-banned-msg">'. $msg .'</div>';
}

/**
 * Theme a chat.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat($chat) {
  $output = '<p>'. l(t('View old messages'), "chatroom/archive/{$chat->ccid}") .'</p>';
  $output .= drupal_get_form('chatroom_chat_form', $chat);
  return $output;
}

/**
 * Theme the chat archive page.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat_archive($chat) {
  $html = '';
  if (isset($chat->when_archived)) {
    $html = '<p>'. t('Archived on !date.', array('!date' => format_date($chat->when_archived, 'medium'))) .'</p>';
  }
  else {
    $html = '<p>'. l(t('Join !chat', array('!chat' => $chat->chatname)), "chatroom/chat/$chat->ccid") .'</p>';
  }
  $previous = '';
  if ($last_cmid = chatroom_load_messages($chat, 0, TRUE)) {
    $html .= '<div id="chatroom-container-archive"><table><tbody valign="top">';
    foreach ($chat->messages as $msg) {
      $name = $msg->name ? $msg->name : variable_get('chatroom_guest_user_prefix', t('guest-')) . $msg->guest_id;
      $html .= '<tr><td><span class="chatroom-archive-date">'. format_date($msg->modified, 'small') .'</span></td>';
      if ($msg->msg_type == 'me') {
        $html .= '<td><p class="chatroom-old-me-msg">';
        $html .= "* $name {$msg->msg}</p></td>";
      }
      else {
        $html .= '<td><p class="chatroom-old-msg">';
        if (empty($msg->recipient)) {
          if ($previous != $name) {
            $html .= '<span class="header">'."$name:</span>";
            $previous = $name;
          }
        }
        else {
          $html .= '<span class="header">'."$name ";
          $recipient = db_result(db_query("
            SELECT u.name FROM {chatroom_online_list} col
            LEFT JOIN {users} u ON u.uid = col.uid
            WHERE col.ccid = %d AND col.guest_id = %d
          ", $msg->ccid, $msg->guest_id));
          $recipient = empty($recipient) ? variable_get('chatroom_guest_user_prefix', t('guest-')) . $msg->recipient : $recipient;
          if ($msg->session_id == session_id() && $recipient != $name) {
            $html .= '<span class="chatroom-private">(privately to '. $recipient .')</span>:</span> ';
          }
          else {
            $html .= '<span class="chatroom-private">(privately)</span>:</span> ';
          }
        }
        $html .= "{$msg->msg}</p></td>";
      }
    }
    $html .= '</tbody></table></div>';
//  $limit = chatroom_chat_old_msg_limit($chat->ccid);
    $limit = 100;
    $html .= theme('pager', array(), $limit);
  }
  else {
    $html .= '<p>'. t('This chat contains no messages.') .'</p>';
  }
  return $html;
}
