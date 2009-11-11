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
    'chatroom_allowed_users_list' => array(
      'arguments' => array('allowed_users'),
    ),
    'chatroom_allowed_user' => array(
      'arguments' => array('allowed_user'),
    ),
    'chatroom_block_chats' => array(
      'arguments' => array(),
    ),
    'chatroom_latest_message' => array(
      'arguments' => array(
        'message',
      ),
    ),
    'chatroom_block_chatrooms' => array(
      'arguments' => array(),
    ),
    'chatroom_message' => array(
      'arguments' => array(
        'message',
        'node',
      ),
    ),
    'chatroom_user_list' => array(
      'arguments' => array(
        'users',
        'node',
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
  if ($chats = chatroom_get_active_chats()) {
    $total = variable_get('chatroom_block_chats', 5);
    foreach ($chats as $number => $node) {
      if ($number == $total) {
        break;
      }
      $id = "chatroom-block-chats-$node->nid";
      $content .= '<li id="' . $id .'">'. l($node->title, "node/$node->nid");
      if (isset($chat->chatroom)) {
        $room_link = l($node->chatroom->title, "node/$node->chatroom->nid");
        $content .= '<br /><span class="chatroomLink">'. t('in') .' '. $room_link .'</span>';
      }
      $content .= '</li>';
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
function theme_chatroom_block_chatrooms() {
  $content = '<ul class="menu" id="chatroom-sitewide-chatrooms">';
  $rooms = chatroom_get_active_chatrooms();
  if (empty($rooms)) {
    $content .= '<li id="chatroom_empty"><em>'. t('There are no active chat rooms.') .'</em></li>';
  }
  else {
    $total = variable_get('chatroom_block_chatrooms', 5);
    foreach ($rooms as $number => $room) {
      if ($number == $total) {
        break;
      }
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
 * Format an array of messages.
 *
 * @ingroup themeable
 */
function theme_chatroom_messages(array $messages, $node) {
  $output = '';
  foreach($messages as $message) {
    $output .= theme('chatroom_message', $message, $node);
  }
  return $output;
}

/**
 * Format a single message for display.
 * 
 * @param mixed $message 
 * @param mixed $node 
 * @return string
 */
function theme_chatroom_message($message, $node) {
  if ($message->uid) {
    $username = l($message->name, 'user/'. $message->uid);
  }
  else {
    $username = $message->name;
  }
  $class = "chatroom-msg new-message" . ($message->msg_type == 'private_message' ? ' chatroom-private' : '');
  $output = '<div class="' . $class . '">';
  $output .= '(' . format_date($message->modified, 'custom', variable_get('chatroom_msg_date_format', 'H:i:s')) . ') <strong>' . $username . ':</strong> ';
  $output .= check_markup($message->msg, $node->format, FALSE);
  $output .= '</div>';
  return $output;
}

/**
 * Format the list of users in a chatroom.
 * 
 * @param mixed $users 
 * @param mixed $node 
 * @return string
 */
function theme_chatroom_user_list($users, $node) {
  global $user;
  $html = '<ul id="chatroom-user-list">';
  $preset = FALSE;
  if (module_exists('imagecache') && $node->chat->imagecache_preset) {
    $preset = imagecache_preset_by_name($node->chat->imagecache_preset);
  }
  foreach ($users as $chat_user) {
    $class = 'chatroom-user' . ($chat_user->sid == session_id() ? ' chatroom-current-user' : '');
    $html .= '<li class="' . $class . '">';
    if ($chat_user->uid && $node->chat->profile_picture && $chat_user->picture) {
      if ($preset) {
        $alt = t("@user's picture", array('@user' => $chat_user->name));
        $chat_user->picture = theme('imagecache', $preset['presetname'], $chat_user->picture, $alt, $alt);
        $html .= $chat_user->picture . theme('username', $chat_user);
      }
      else { 
        $html .= theme('user_picture', $chat_user);
      }
    }
    else {
      $html .= theme('username', $chat_user);
    }
    $html.= '</li>';
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
  global $user;
  
  $output = '<style type="text/css">#chatroom-board-container { width: ' . variable_get('chatroom_message_board_width', '100%') . ';}</style>';
  $output .= theme('chatroom_user_list', $node->chat->users, $node);
  $output .= '<div id="chatroom-board-container">';
  $output .= '<div id="chatroom-board">';
  foreach (chatroom_chat_load_messages($node->nid, 0, 20) as $message) {
    $output .= theme('chatroom_message', $message, $node);
  }
  $output .= '</div></div>';
  $output .= theme('chatroom_buttons', $node);
  if (!$node->is_popout) {
    $output .= '<div id="chatroom-popout-link"><a href="#">View this chat in a popout window</a></div>';
    chatroom_set_popout_link_js($node, '#chatroom-popout-link');
  }
  if ($node->chat->private && ($node->uid == $user->uid || user_access('administer chats'))) {
    $output .= drupal_get_form('chatroom_chat_user_manager_form', $node);
  }
  if (user_access('administer chats') || user_access('administer chat rooms')) {
    $output .= drupal_get_form('chatroom_archive_chat_form', $node->nid);
  }
  return $output;
}

/**
 * Form fields for chatroom text entry.
 * 
 * @param mixed $form_state 
 * @param mixed $node 
 * @return array
 */
function chatroom_chat_buttons($form_state, $node) {
  $form['chatroom_message_entry_box'] = array(
    '#type' => 'textarea',
    '#title' => t('Enter your message text here'),
    '#size' => 50,
    '#rows' => 1,
    '#maxlength' => variable_get('chatroom_max_message_size', 1000),
  );
  return $form;
}

/**
 * Theme chat buttons.
 *
 * @ingroup themeable
 */
function theme_chatroom_buttons($node) {
  $output = drupal_get_form('chatroom_chat_buttons', $node);
  return '<div id="chatroom-chat-buttons">' . $output . '</div>';
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
  if (isset($vars['node']) && arg(2) != 'edit' && $vars['node']->type == 'chat' && isset($_GET['chatroom_popout'])) {
    if ($vars['node']->chat->when_archived === NULL) {
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
      $params = array(
        '!date' => format_date($node->chat->latest_msg->modified, 'medium'),
        '%message' => $node->chat->latest_msg->msg,
        '!user' => theme('username', user_load($node->chat->latest_msg->uid)),
        '%message_count' => $node->chat->msg_count,
      );
      return t("Last message at !date: %message by !user. Total messages: %message_count.", $params);
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

/**
 * Theme the user list widget.
 * 
 * @param mixed $allowed_users
 * @return string
 */
function theme_chatroom_allowed_users_list($allowed_users) {
  $html = '<ul id="chatroom_allowed_users_list">';
  foreach ($allowed_users as $allowed_user) {
    $html .= '<li id="chatroom_allowed_user_li_' . $allowed_user->uid . '">' . theme('chatroom_allowed_user', $allowed_user) . '</li>';
  }
  $html .= '</ul>';
  return $html;
}

/**
 * Theme an item in the allowed user list.
 * 
 * @param mixed $allowed_user 
 * @return string
 */
function theme_chatroom_allowed_user($allowed_user) {
  return theme('username', $allowed_user) 
         . ' [<a id="chatroom_allowed_user_' . $allowed_user->uid 
         . '" class="chatroom-remove-user" href="#remove">' 
         . 'Click here to remove from chat.</a>]';
}

