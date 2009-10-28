<?php
// $Id$

/**
 * @file
 * Form functions for chatroom.module.
 */

/**
 * Implementation of hook_forms()
 */
function chatroom_forms() {
  $forms['chatroom_chat_form'] = array(
    'callback' => 'chatroom_chat_interface',
  );
  $forms['chatroom_create_chat_form'] = array(
    'callback' => 'chatroom_create_chat_form',
  );
  $forms['chatroom_archive_chat_form'] = array(
    'callback' => 'chatroom_archive_chat_form',
  );
  $forms['chatroom_unarchive_chat_form'] = array(
    'callback' => 'chatroom_unarchive_chat_form',
  );
  return $forms;
}

/**
 * Implementation of hook_form().
 */
function chatroom_form(&$node, $form_state) {
  global $user;
  $form['title'] = array(
    '#type' => 'textfield',
    '#title' => t('Name'),
    '#default_value' => check_plain($node->title),
    '#required' => TRUE,
  );
  $form['body_filter']['body'] = array(
    '#type' => 'textarea',
    '#title' => t('Description'),
    '#default_value' => $node->body,
    '#rows' => 3,
    '#description' => t('Describe your chat room so other people will know if they want to join.'),
  );
  $form['body_filter']['format'] = filter_form($node->format);
  $form['kicked_out_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat room kicked out message'),
    '#default_value' => isset($node->chatroom->kicked_out_message) ? $node->chatroom->kicked_out_message : null,
    '#rows' => 3,
    '#description' => t('This text will appear on the page kicked out users are sent to. Defaults to, "You have been kicked out of %chat for misbehaving."', array('%chat' => t('chat-name'))),
  );
  $form['banned_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat room banned message'),
    '#default_value' => isset($node->chatroom->banned_message) ? $node->chatroom->banned_message : null,
    '#rows' => 3,
    '#description' => t('This text will appear on the page banned users are sent to. Defaults to, "You have been banned from %chatroom."', array('%chatroom' => t('chat-room'))),
  );
  if (!empty($node->chatroom->banned_users)) {
    $form['chatroom_banned_users'] = array(
      '#type' => 'fieldset',
      '#title' => t('Manage banned users'),
      '#collapsible' => TRUE,
    );
    foreach ($node->chatroom->banned_users as $banned_user) {
      $banned_users[$banned_user->uid] = check_plain($banned_user->name);
    }
    $form['chatroom_banned_users']['unban_list'] = array(
      '#type' => 'checkboxes',
      '#options' => $banned_users,
      '#description' => t('Check the users you would like to unban'),
    );
  }
  $form['chat_settings'] = array(
    '#type' => 'fieldset',
    '#title' => t('Chat settings'),
    '#collapsible' => TRUE,
  );
  $form['chat_settings']['poll_freq'] = array(
    '#type' => 'select',
    '#title' => t('Update frequency'),
    '#default_value' => empty($node->chatroom->poll_freq) ? 1 : $node->chatroom->poll_freq / 1000,
    '#options' => drupal_map_assoc(range(1, 10)),
    '#description' => t('How many seconds between each request for updates from the server.'),
  );
  $form['chat_settings']['idle_freq'] = array(
    '#type' => 'select',
    '#title' => t('Idle time'),
    '#default_value' => empty($node->chatroom->idle_freq) ? 60 : $node->chatroom->idle_freq / 1000,
    '#options' => drupal_map_assoc(array(20, 40, 60, 80, 100, 120, 140, 160, 180)),
    '#description' => t('How many seconds between each message before a last message time is shown in the chat.'),
  );
  $old_msg_range = array();
  for ($i = 1; $i <= 25; $i++) {
    $old_msg_range[$i] = $i * 10;
  }
  $form['chat_settings']['previous_messages_display_count'] = array(
    '#type' => 'select',
    '#title' => t('Old messages'),
    '#description' => t('How many old messages to show when entering a chat.'),
    '#default_value' => empty($node->chatroom->previous_messages_display_count) ? 20 : $node->chatroom->previous_messages_display_count,
    '#options' => drupal_map_assoc($old_msg_range),
  );
  $form['chat_settings']['popout'] = array(
    '#type' => 'checkbox',
    '#title' => t("Load this rooms' chats in a popout?"),
    '#description' => t('Should chats in this room default to loading in a popup window?'),
    '#default_value' => isset($node->chatroom) ? $node->chatroom->popout : 0,
  );
  if (!empty($node->chatroom->chats)) {
    foreach ($node->chatroom->chats as $chat) {
      if ($chat->section != 'archives') {
        $chats[$chat->ccid] = check_plain($chat->chatname);
      }
      else {
        $closed_chats[$chat->ccid] = check_plain($chat->chatname);
      }
    }
    if (!empty($chats)) {
      $form['chatroom_chats'] = array(
        '#type' => 'fieldset',
        '#title' => t('Manage open chats'),
        '#collapsible' => TRUE,
        '#collapsed' => FALSE,
      );
      $form['chatroom_chats']['chat_list'] = array(
        '#type' => 'checkboxes',
        '#options' => $chats,
        '#description' => t('Check the chats you would like to close'),
      );
    }
    if (!empty($closed_chats)) {
      $form['closed_chats'] = array(
        '#type' => 'fieldset',
        '#title' => t('Manage archived chats'),
        '#collapsible' => TRUE,
        '#collapsed' => FALSE,
      );
      $form['closed_chats']['closed_chat_list'] = array(
        '#type' => 'checkboxes',
        '#options' => $closed_chats,
        '#description' => t('Check the chats you would like to delete'),
      );
    }
  }
  return $form;
}

/**
 * Menu callback; display site-wide chat room settings.
 */
function chatroom_admin_settings() {
  $form['chatroom_auto_archive'] = array(
    '#type' => 'checkbox',
    '#title' => t('Automatically archive old messages.'),
    '#description' => t('If there are a lot of old messages, archiving will improve chat performance.'),
    '#default_value' => variable_get('chatroom_auto_archive', FALSE),
  );
  $form['chatroom_block_update_interval'] = array(
    '#type' => 'textfield',
    '#title' => t('Chat room block update interval'),
    '#default_value' => variable_get('chatroom_block_update_interval', 5),
    '#description' => t('Determines how often blocks should update active chat rooms, active chats, and on-line users.'),
    '#size' => 2,
  );
  $form['chatroom_guest_user_prefix'] = array(
    '#type' => 'textfield',
    '#title' => t('Guest user prefix'),
    '#description' => t('Prefixed to guest ID to provide user name for anonymous users.'),
    '#default_value' => variable_get('chatroom_guest_user_prefix', t('guest-')),
    '#size' => 20,
  );
  $form['chatroom_chat_message_text'] = array(
    '#type' => 'textfield',
    '#title' => t('Chat message help text'),
    '#description' => t('The text to be displayed next to the chat message form field.'),
    '#default_value' => variable_get('chatroom_chat_message_text', t('Type your message and hit enter')),
    '#size' => 20,
  );
  $form['chatroom_chat_date_format'] = array(
    '#type' => 'textfield',
    '#title' => t('Chat date format'),
    '#attributes' => array('class' => 'custom-format'),
    '#default_value' => variable_get('chatroom_chat_date_format', '* \S\e\n\t \a\t G:i'),
    '#description' => t('Format for system time messages in chats. See the <a href="@url">PHP manual</a> for available options. This format is currently set to display as <span>%date</span>.', array('@url' => 'http://php.net/manual/function.date.php', '%date' => format_date(time(), 'custom', variable_get('chatroom_chat_date_format', '* \S\e\n\t \a\t G:i')))),
  );
  if (module_exists('smileys')) {
    $form['chatroom_smileys_support'] = array(
      '#type' => 'fieldset',
      '#title' => t('Smileys module support'),
      '#collapsible' => TRUE,
      '#collapsed' => TRUE,
    );
    $form['chatroom_smileys_support']['chatroom_smileys_enabled'] = array(
      '#type' => 'checkbox',
      '#title' => t('Enable Smileys module support.'),
      '#default_value' => variable_get('chatroom_smileys_enabled', FALSE),
    );
    $form['chatroom_smileys_support']['chatroom_smileys_showtextentry'] = array(
      '#type' => 'checkbox',
      '#title' => t('Show smileys in text entry box.'),
      '#default_value' => variable_get('chatroom_smileys_enabled', FALSE) && variable_get('chatroom_smileys_showtextentry', FALSE),
      '#disabled' => !variable_get('chatroom_smileys_enabled', FALSE),
    );
  }
  $form['chatroom_alerts'] = array(
    '#type' => 'fieldset',
    '#title' => t('Chat alerts'),
    '#collapsible' => TRUE,
    '#collapsed' => TRUE,
  );
  $form['chatroom_alerts']['chatroom_alerts'] = array(
    '#type' => 'checkbox',
    '#title' => t('Enable chat alerts.'),
    '#description' => t('Checking this box will allow users to turn on alerts for chat events.'),
    '#default_value' => variable_get('chatroom_alerts', FALSE),
  );
  $form['chatroom_alerts']['chatroom_alerts_default'] = array(
    '#type' => 'checkbox',
    '#title' => t('Turn alerts on by default.'),
    '#description' => t('Check this box if you want chats to open with alerts on.'),
    '#default_value' => variable_get('chatroom_alerts', FALSE) && variable_get('chatroom_alerts_default', FALSE),
    '#disabled' => !variable_get('chatroom_alerts', FALSE),
  );
  $form['chatroom_alerts']['chatroom_custom_sounds'] = array(
    '#type' => 'checkbox',
    '#title' => t('Use custom sounds for chat alerts.'),
    '#description' => t('Check this box if you want to replace default chat alert sounds with your own MP3s.'),
    '#default_value' => variable_get('chatroom_alerts', FALSE) && variable_get('chatroom_custom_sounds', FALSE),
    '#disabled' => !variable_get('chatroom_alerts', FALSE),
  );
  return system_settings_form($form);
}

/**
 * Validate site-wide chat room settings.
 */
function chatroom_admin_settings_validate($form, &$form_state) {
  // Check for a valid update interval.
  $interval = $form_state['values']['chatroom_block_update_interval'];
  if (is_numeric($interval)) {
    if ($interval == 0) {
      form_set_error('chatroom_block_update_interval', t('The block update interval cannot be zero.'));
    }
    elseif ($interval < 0) {
      form_set_error('chatroom_block_update_interval', t('The block update interval cannot be negative.'));
    }
  }
  else {
    form_set_error('chatroom_block_update_interval', t('The block update interval must be a number.'));
  }
}

/**
 * Implementation of hook_form().
 *
 * TODO: make the default values cascade.
 */
function chatroom_chat_form(&$node, $form_state) {

  global $user;
  $form['title'] = array(
    '#type' => 'textfield',
    '#title' => t('Name'),
    '#default_value' => check_plain($node->title),
    '#description' => t('The name for your chat.'),
    '#required' => TRUE,
  );
  $form['body_filter']['body'] = array(
    '#type' => 'textarea',
    '#title' => t('Description'),
    '#default_value' => $node->body,
    '#rows' => 3,
    '#description' => t('Describe your chat so other people will know if they want to join.'),
  );
  $form['body_filter']['format'] = filter_form($node->format);
  $form['kicked_out_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat kicked out message'),
    '#default_value' => '',
    '#rows' => 3,
    '#description' => t('This text will appear on the page kicked out users are sent to. Defaults to, "You have been kicked out of %chat for misbehaving."', array('%chat' => t('chat-name'))),
  );
  $form['banned_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat room banned message'),
    '#default_value' => '',
    '#rows' => 3,
    '#description' => t('This text will appear on the page banned users are sent to. Defaults to, "You have been banned from %chatroom."', array('%chatroom' => t('chat-room'))),
  );
  if (!empty($node->banned_users)) {
    $form['chatroom_banned_users'] = array(
      '#type' => 'fieldset',
      '#title' => t('Manage banned users'),
      '#collapsible' => TRUE,
    );
    foreach ($node->banned_users as $banned_user) {
      $banned_users[$banned_user->uid] = check_plain($banned_user->name);
    }
    $form['chatroom_banned_users']['unban_list'] = array(
      '#type' => 'checkboxes',
      '#options' => $banned_users,
      '#description' => t('Check the users you would like to unban'),
    );
  }
  $form['chat_settings'] = array(
    '#type' => 'fieldset',
    '#title' => t('Chat settings'),
    '#collapsible' => TRUE,
  );
  $form['chat_settings']['poll_freq'] = array(
    '#type' => 'select',
    '#title' => t('Update frequency'),
    '#default_value' => empty($node->poll_freq) ? 1 : $node->poll_freq / 1000,
    '#options' => drupal_map_assoc(range(1, 10)),
    '#description' => t('How many seconds between each request for updates from the server.'),
  );
  $form['chat_settings']['idle_freq'] = array(
    '#type' => 'select',
    '#title' => t('Idle time'),
    '#default_value' => empty($node->idle_freq) ? 60 : $node->idle_freq / 1000,
    '#options' => drupal_map_assoc(array(20, 40, 60, 80, 100, 120, 140, 160, 180)),
    '#description' => t('How many seconds between each message before a last message time is shown in the chat.'),
  );
  $form['chat_settings']['popout'] = array(
    '#type' => 'checkbox',
    '#title' => t('Load this chat in a popout?'),
    '#description' => t('Should this chat load in a popup window?'),
    '#default_value' => isset($node->chat) ? $node->chat->popout : 0,
  );
  $previous_msg_range = array();
  for ($i = 1; $i <= 25; $i++) {
    $previous_msg_range[$i] = $i * 10;
  }
  $form['chat_settings']['previous_messages_display_count'] = array(
    '#type' => 'select',
    '#title' => t('Old messages'),
    '#description' => t('How many old messages to show when entering a chat.'),
    '#default_value' => empty($node->previous_messages_display_count) ? 20 : $node->previous_messages_display_count,
    '#options' => drupal_map_assoc($previous_msg_range),
  );
  return $form;
}

function chatroom_chat_interface(&$form_state, $node) {
  // The message board itself.
  $form['board']['#value'] = theme('chatroom_user_list', $node->chat->users);
  $form['board']['#value'] .= '<div id="chatroom-board">';
  // Messages for initial display.
  if (!$form_state['submitted']) {
    $messages = chatroom_chat_load_messages($chat->nid, 0, 20);
    $form['board']['#value'] .= theme('chatroom_messages', $messages);
  }
  $form['board']['#value'] .= '</div>';
  // Control data for the form
  $form['control'] = array(
    '#type' => 'fieldset',
    '#attributes' => array('id' => 'edit-control-fieldset'),
  );
  $data = array('nid');
  // The actual submit button. Not displayed so the user isn't troubled with a
  // whole bunch of throbbers.
  $form['control']['submit'] = array(
    '#type' => 'submit',
    '#name' => 'submit',
    '#ahah' => array(
      'path' => 'chatroom/js',
      'wrapper' => 'chatroom-board',
      'method' => 'append',
    ),
  );
  // Other form elements.
  $form['message'] = array(
    '#type' => 'textfield',
    '#title' => variable_get('chatroom_chat_message_text', t('Type your message and hit enter')),
    '#size' => 50,
    '#maxlength' => variable_get('chatroom_max_message_size', 1000),
  );
  $form['away'] = array(
     '#type' => 'checkbox',
     '#title' => t('Show me as away.'),
     '#name' => 'away',
  );
  if (variable_get('chatroom_alerts', FALSE)) {
    $checked = variable_get('chatroom_alerts_default', FALSE) ? ' checked' : '';
    $form['alerts'] = array(
      '#type' => 'checkbox',
      '#title' => t('Alert me if new messages are received.'),
      '#name' => 'alert',
    );
  }
  return $form;
}

/**
 * Return a create chat form.
 */
function chatroom_create_chat_form(&$form_state, $room) {
  $form['chatroom_create_chat'] = array(
    '#type' => 'fieldset',
    '#title' => t('Create a new chat'),
    '#collapsible' => TRUE,
    '#collapsed' => FALSE,
  );
  $form['chatroom_create_chat']['chat_name'] = array(
    '#type' => 'textfield',
    '#title' => t('Chat name'),
    '#size' => 30,
    '#required' => TRUE,
    '#description' => t('Enter the name for the chat'),
  );
  $form['chatroom_create_chat']['nid'] = array(
    '#type' => 'hidden',
    '#value' => $room->nid,
  );
  $form['chatroom_create_chat']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Create chat'),
  );
  $form['#validate'][] = 'chatroom_create_chat_form_validate';
  $form['#submit'][] = 'chatroom_create_chat_form_submit';
  return $form;
}

/**
 * Validate attempt to create chat - check if name is already in use.
 */
function chatroom_create_chat_form_validate($form, &$form_state) {
  $nid = $form_state['values']['nid'];
  $name = $form_state['values']['chat_name'];
  $sql = "SELECT COUNT(nid) FROM {chatroom_chat} WHERE crid = %d AND chatname = '%s' AND when_archived IS NULL";
  if (db_result(db_query_range($sql, $nid, $name, 0, 1))) {
    form_set_error('chatroom_chat_name', t('A chat called %name already exists.', array('%name' => $name)));
  }
}

/**
 * Create a chat.
 */
function chatroom_create_chat_form_submit($form, &$form_state) {
  global $user;
  $created = db_query("
    INSERT INTO {chatroom_chat} (crid, chatname, modified)
    VALUES (%d, %d, '%s', %d)
  ", $form_state['values']['nid'], $form_state['values']['chat_name'], time());
  if (!$created) {
    drupal_set_message(t("There was an error creating your chat"), 'error');
  }
  else {
    cache_clear_all(TRUE, 'cache_block');
  }
}

/**
 * Form to unarchived a chat.
 *
 * @param array $form_state
 * @param integer $chat_id
 * @return array
 */
function chatroom_unarchive_chat_form($form_state, $chat_id) {
  $form['chat_id'] = array(
    '#type' => 'value',
    '#value' => $chat_id,
  );
  $form['unarchive'] = array(
    '#type' => 'submit',
    '#value' => t('Unarchive this chat'),
  );
  return $form;
}

/**
 * Unarchive an open chat.
 *
 * @param array $form
 * @param array $form_state
 * @return string
 */
function chatroom_unarchive_chat_form_submit($form, &$form_state) {
  chatroom_unarchive_chat($form_state['values']['chat_id']);
  cache_clear_all(TRUE, 'cache_block');
}

/**
 * form for archived chat view of open chat to archive that chat
 *
 * @param array $form_state
 * @param integer $chat_id
 * @return array
 */
function chatroom_archive_chat_form($form_state, $chat_id) {
  $form['chat_id'] = array(
    '#type' => 'value',
    '#value' => $chat_id,
  );
  $form['delete'] = array(
    '#type' => 'submit',
    '#value' => t('Archive this chat'),
  );
  return $form;
}

/**
 * Archive an open chat.
 *
 * @param array $form_id
 * @param array $form_values
 * @return string
 */
function chatroom_archive_chat_form_submit($form, &$form_state) {
  chatroom_archive_chat($form_state['values']['chat_id']);
  cache_clear_all(TRUE, 'cache_block');
}

