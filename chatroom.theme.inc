<?php
// $Id$

/**
 * $file
 * Theme functions for chatroom.module.
 */

/**
 * Implementation of hook_theme().
 */
function chatroom_theme($existing, $type, $theme, $path) {
  // Add the path to our module folder so we can pick up popout template.
  $page = $existing['page'];
  $page['theme paths'][] = drupal_get_path('module', 'chatroom');
  return array( 
    'page' => $page,
    'chatroom_block_chats' => array(
      'arguments' => array(),
    ),
    'chatroom_latest_message' => array(
      'arguments' => array('message'),
    ),
    'chatroom_block_rooms' => array(
      'arguments' => array(),
    ),
    'chatroom_block_chat_users' => array(
      'arguments' => array(
        'chat' => NULL,
      ),
     ),
    'chatroom_block_site_users' => array(
      'arguments' => array(),
    ),
    'chatroom_message' => array(
      'arguments' => array(
        'message',
      ),
    ),
    'chatroom_user_list' => array(
      'arguments' => array(
        'users',
        'chat',
      ),
    ),
    'chatroom_chat_kicked_user' => array(
      'arguments' => array(
        'node', 
      ),
    ),
    'chatroom_chat_banned_user' => array(
      'arguments' => array(
        'node',
      ),
    ),
    'chatroom_list' => array(
      'arguments' => array(
        'tree',
      ),
    ),
    'chatroom_chat' => array(
      'arguments' => array(
        'chat',
      ),
    ),
    'chatroom_chat_archive' => array(
      'arguments' => array(
        'chat',
      ),
    ),
    'chatroom_buttons' => array(
      'arguments' => array(
        'chat' => NULL,
      ),
    ),
    'chatroom_chat_teaser' => array(
      'arguments' => array(
        'node',
      ),
    ),
    'chatroom_teaser' => array(
      'arguments' => array(
        'node',
      ),
    ),
  );
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
function theme_chatroom_block_chat_users($chat) {
  chatroom_load_users($chat);
  $title = '';
  $content = '';
  if (!empty($chat->users)) {
    $title = t('Who is on line in %chat', array('%chat' => $chat->chatname));
    $content = '<ul class="menu" id="chatroom-online">';
    foreach ($chat->users as $chat_user) {
      $content .= '<li id="'. $chat_user->guest_id .'"';
      $content .= isset($chat_user->away) && $chat_user->away ? ' class="chatroom-user-away">' : '>';
      $content .= $chat_user->name . '</li>';
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
function theme_chatroom_messages(array $messages) {
  $output = '';
  foreach($messages as $message) {
    $output .= theme('chatroom_message', $message);
  }
  return $output;
}

/**
 * @ingroup themeable.
 */

/**
 * Format a single message for display.
 *
 * TODO: use a configurable format.
 *
 * @ingroup themeable
 */
function theme_chatroom_message($message) {
  if ($message->uid) {
    $username = l($message->name, 'user/'. $message->uid);
  }
  else {
    $username = $message->name;
  }
  $class = "chatroom-msg new-message" . ($message->msg_type == 'private_message' ? ' chatroom-private' : '');
  $output = '<div class="' . $class . '">';
  $output .= '<strong>' . $username . ':</strong> ';
  $output .= check_markup($message->msg, FILTER_FORMAT_DEFAULT, FALSE);
  $output .= '</div>';
  return $output;
}

/**
 * Format the list of users in a chatroom.
 *
 * @ingroup themeable
 */
function theme_chatroom_user_list($users, $chat) {
  global $user;
  $html = '<ul id="chatroom-user-list">';
  if (!empty($users)) {
    foreach ($users as $chat_user) {
      $class = 'chatroom-user' . ($chat_user->sid == session_id() ? ' chatroom-current-user' : '');
      $html .= '<li class="' . $class . '">' . theme('username', $chat_user);
      if ($chat->chat->profile_picture) {
        $size = variable_get('chatroom_profile_picture_preset', 0);
        if (module_exists('imagecache') && $size && $chat_user->uid) {
          $preset = imagecache_preset($size);
          $alt = t("@user's picture", array('@user' => $chat_user->name));
          $chat_user->picture = theme('imagecache', $preset['presetname'], $chat_user->picture, $alt, $alt);
          $html .= $chat_user->picture . theme('username', $chat_user);
        }
        else { 
          $html .= theme('user_picture', $chat_user);
        }
      }
      $html.= '</li>';
    }
  }
  $html .= '</ul>';
  return $html;
}

/**
 * Format a message for display in a summary table.
 */
function theme_chatroom_latest_message($message) {
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
          $description .= ' <div class="name">'. l($chat->chatname, "chatroom/chat/$chat->ccid") ."</div>\n";
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
function theme_chatroom_chat_kicked_user($node) {
  $msg = $node->chat->kicked_out_message ? $node->chat->kicked_out_message : t('You have been kicked out of %chat for misbehaving.', array('%chat' => $node->title));
  return '<div id="chatroom-kicked-msg">'. $msg .'</div>';
}

/**
 * Get HTML for ban message.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat_banned_user($chat) {
  $msg = $node->chat->banned_message ? $node->chat->banned_message : t('You have been banned from %chat for misbehaving.', array('%chat' => $node->title));
  return '<div id="chatroom-banned-msg">'. $msg .'</div>';
}

/**
 * Theme a chat.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat($node) {
  $output = theme('chatroom_user_list', $node->chat->users, $node);
  $output .= '<div id="chatroom-board">';
  foreach (chatroom_chat_load_messages($node->nid, 0, 20) as $message) {
    $output .= theme('chatroom_message', $message); 
  }
  $output .= '</div>';
  $output .= theme('chatroom_buttons', $node);
  if (user_access('administer chats') || user_access('administer chat rooms')) {
    $output .= drupal_get_form('chatroom_archive_chat_form', $node->nid);
  }
  return $output;
}

/**
 * Theme chat buttons.
 *
 * @ingroup themeable
 */
function theme_chatroom_buttons($chat) {
  return '<div id="chatroom-chat-buttons"><input id="chatroom-chat-message-submit" type="text" value="" /></div>';
}

/**
 * Theme the chat archive page.
 *
 * @ingroup themeable
 */
function theme_chatroom_chat_archive($node) {
  global $user;
  
  $is_admin = user_access('administer chats') || user_access('administer chat rooms');

  $html = '<p>' . t('Archived on !date.', array('!date' => format_date($node->chat->when_archived, 'medium'))) . '</p>';
  $html .= '<div id="chatroom-container-archive">';
  if ($messages = chatroom_chat_load_messages($node->nid)) {
    $table_rows = array();
    foreach ($messages as $msg) {
      $name = isset($msg->name) ? $msg->name : variable_get('chatroom_guest_user_prefix', t('guest-')) . $msg->guest_id;
      if (empty($msg->recipient_uid)) {
        $row_html = '<span class="chatroom-archive-date">'. format_date($msg->modified, 'small') .'</span>';
        $row_html .= '<span class="chatroom-old-msg"><span class="header">' . "$name:</span>$msg->msg</span>";
      }
      else if ($is_admin || $user->uid == $msg->uid || $user->uid == $msg->recipient_uid) {
        $row_html = '<span class="chatroom-archive-date">'. format_date($msg->modified, 'small') .'</span>';
        $row_html .= '<span class="chatroom-old-msg">';
        $row_html .= '<span class="header">' . "$name ";
        if ($msg->uid == $user->uid && $recipient != $name) {
          $row_html .= '<span class="chatroom-private">(privately to '. $recipient .')</span>:</span> ';
        }
        else {
          $row_html .= '<span class="chatroom-private">(privately)</span>:</span> ';
        }
        $row_html .= $msg->msg . '</span>';
      }
      $table_rows[] = array($row_html); 
    }
    $html .= theme('table', array(), $table_rows);
  }
  else {
    $html .= '<p>' . t('This chat contains no messages.') . '</p>';
  }
  $html .= '</div>';
  return $html;
}

/**
 * Implementation of hook_preprocess_page().
 */
function chatroom_preprocess_page(&$vars) {
  // Add a template hint for the popout page template.
  if (isset($vars['node']) && arg(2) != 'edit' && $vars['node']->type == 'chat') {
    if ($vars['node']->chat->popout && $vars['node']->chat->when_archived === NULL) {
      $vars['template_files'] = array('page-chat-popout');
    }
  }
}

/**
 * Theme the teaser for a chat node.
 */
function theme_chatroom_chat_teaser($node) {
  if ($node->chat->when_archived) {
    $params = array(
      '!date' => format_date($node->chat->when_archived, 'medium'),
      '%message_count', $node->chat->msg_count,
    );
    return t('Archived on !date, contains %message_count messages.', $params);
  }
  else {
    if ($node->chat->latest_msg) {
      $popout_text = '';
      if ($node->chat->popout) {
        drupal_add_js(chatroom_get_popout_link_js($node), 'inline', 'footer');
        $popout_text = t('This chat will load in a popout window.');
      }
      $params = array(
        '!date' => format_date($node->chat->latest_msg->modified, 'medium'),
        '%message' => $node->chat->latest_msg->msg,
        '%user' => theme('username', user_load($node->chat->latest_msg->uid)),
        '%message_count' => $node->chat->msg_count,
      );
      return t("Last message at !date: %message by %user. Total messages: %message_count. $popout_text", $params);
    }
    else {
      return t('There are no messages in this chat.');
    }
  }
}

/**
 * Theme the teaser for a chatroom node.
 */
function theme_chatroom_teaser($node) {
  $params = array(
    '%open_chats' => count($node->chatroom->chats),
  );
  return t('There are %open_chats chats in this chatroom.', $params);
}

