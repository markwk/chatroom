<?php

/**
 * Menu callback; Show list of chatroom_echat types we can add.
 */
function chatroom_echat_add_page() {
  $item = menu_get_item();
  $links = system_admin_menu_block($item);

  foreach ($links as $link) {
    $items[] = l($link['title'], $link['href'], $item['localized_options'])
      . ': ' . filter_xss_admin($link['description']);
  }

  return theme('item_list', array('items' => $items));
}

/**
 * Present an chatroom_echat submission form.
 */
function chatroom_echat_add($type) {
  global $user;

  $types = chatroom_echat_types();
  $type = isset($type) ? str_replace('-', '_', $type) : NULL;
  if (empty($types[$type])) {
    return MENU_NOT_FOUND;
  }

  $chatroom_echat = entity_get_controller('chatroom_echat')->create($type);

  drupal_set_title(t('Create @name', array('@name' => $types[$type]->name)), PASS_THROUGH);
  return drupal_get_form($type . '_chatroom_echat_form', $chatroom_echat);
}

/**
 * Menu callback; presents the chatroom_echat editing form, or redirects to delete confirmation.
 *
 * @param $chatroom_echat
 *   The chatroom_echat object to edit.
 */
function chatroom_echat_page_edit($chatroom_echat) {
  $types = chatroom_echat_types();
  drupal_set_title(t('<em>Edit @type</em> @title', array('@type' => $types[$chatroom_echat->type]->name, '@title' => $chatroom_echat->title)), PASS_THROUGH);

  return drupal_get_form($chatroom_echat->type . '_chatroom_echat_form', $chatroom_echat);
}

/**
 * Form builder; Displays the chatroom_echat add/edit form.
 *
 * @param $form
 * @param $form_state
 * @param $chatroom_echat
 *   The chatroom_echat object to edit, which may be brand new.
 */
function chatroom_echat_form($form, &$form_state, $chatroom_echat) {

  // Set the id and identify this as an chatroom_echat edit form.
  $form['#id'] = 'chatroom_echat-form';

  // Save the chatroom_echat for later, in case we need it.
  $form['#chatroom_echat'] = $chatroom_echat;
  $form_state['chatroom_echat'] = $chatroom_echat;

  // Common fields. We don't have many.
  $form['title'] = array(
    '#type' => 'textfield',
    '#title' => t('Title'),
    '#default_value' => check_plain($chatroom_echat->title),
    '#weight' => -5,
    '#required' => TRUE,
  );
  $form['chatroom_nid'] = array(
    '#type' => 'hidden',
    '#value' => '',
    '#value' => isset($node->chat) && $node->chat->chatroom ? $node->chat->chatroom->nid : 0,
  );
  $form['kicked_out_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat kicked out message'),
    '#default_value' => isset($node->chat) ? $node->chat->kicked_out_message : '',
    '#rows' => 3,
    '#description' => t('This text will appear on the page kicked out users are sent to. Defaults to, "You have been kicked out of %chat for misbehaving."', array('%chat' => t('chat-name'))),
  );
  $form['banned_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Chat room banned message'),
    '#default_value' => isset($node->chat) ? $node->chat->banned_message : '',
    '#rows' => 3,
    '#description' => t('This text will appear on the page banned users are sent to. Defaults to, "You have been banned from %chatroom."', array('%chatroom' => t('chat-room'))),
  );
  if (!empty($node->chat->banned_list)) {
    $form['chatroom_banned_users'] = array(
      '#type' => 'fieldset',
      '#title' => t('Manage banned users'),
      '#collapsible' => TRUE,
    );
    foreach ($node->chat->banned_list as $banned_user) {
      $banned_users[$banned_user->uid] = check_plain(user_load($banned_user->uid)->name);
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
    '#default_value' => isset($node->chat) ? $node->chat->poll_freq : 1,
    '#options' => drupal_map_assoc(range(1, 10)),
    '#description' => t('How many seconds between each request for updates from the server.'),
  );
  $form['chat_settings']['private'] = array(
    '#type' => 'checkbox',
    '#title' => t('Make the chat private?'),
    '#default_value' => isset($node->chat) ? $node->chat->private : 0,
    '#description' => t('Do you want this chat to be private?'),
  );
  $form['chat_settings']['idle_freq'] = array(
    '#type' => 'select',
    '#title' => t('Idle time'),
    '#default_value' => isset($node->chat) ? $node->chat->idle_freq : 60,
    '#options' => drupal_map_assoc(array(20, 40, 60, 80, 100, 120, 140, 160, 180)),
    '#description' => t('How many seconds between each message before a last message time is shown in the chat.'),
  );
  $form['chat_settings']['max_users'] = array(
    '#type' => 'textfield',
    '#title' => t('Maximum users'),
    '#default_value' => isset($node->chat) ? $node->chat->max_users : 0,
    '#description' => t('The maximum number of users for this chat. 0 is unlimited'),
    '#size' => 5,
  );
  $previous_msg_range = array();
  for ($i = 1; $i <= 25; $i++) {
    $previous_msg_range[$i] = $i * 10;
  }
  $form['chat_settings']['previous_messages_display_count'] = array(
    '#type' => 'select',
    '#title' => t('Old messages'),
    '#description' => t('How many old messages to show when entering a chat.'),
    '#default_value' => isset($node->chat) ? $node->chat->previous_messages_display_count : 20,
    '#options' => drupal_map_assoc($previous_msg_range),
  );

  $form['revision'] = array(
    '#access' => user_access('administer chatroom_echat'),
    '#type' => 'checkbox',
    '#title' => t('Create new revision'),
    '#default_value' => 0,
  );

  // Add the buttons.
  $form['buttons'] = array();
  $form['buttons']['#weight'] = 100;
  $form['buttons']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
    '#weight' => 5,
    '#submit' => array('chatroom_echat_form_submit'),
  );
  if (!empty($chatroom_echat->nid)) {
    $form['buttons']['delete'] = array(
      '#access' => user_access('delete chatroom_echat'),
      '#type' => 'submit',
      '#value' => t('Delete'),
      '#weight' => 15,
      '#submit' => array('chatroom_echat_form_delete_submit'),
    );
  }

  $form['#validate'][] = 'chatroom_echat_form_validate';

  field_attach_form('chatroom_echat', $chatroom_echat, $form, $form_state);

  return $form;
}

function chatroom_echat_form_validate($form, &$form_state) {
  $chatroom_echat = $form_state['chatroom_echat'];

  // Field validation.
  field_attach_form_validate('chatroom_echat', $chatroom_echat, $form, $form_state);
}


function chatroom_echat_form_submit($form, &$form_state) {
  global $user;

  $chatroom_echat = &$form_state['chatroom_echat'];

  // Set the chatroom_echat's uid if it's being created at this time.
  if (empty($chatroom_echat->uid)) {
    $chatroom_echat->uid = $user->uid;
  }

  $chatroom_echat->title = $form_state['values']['title'];
  $chatroom_echat->revision = $form_state['values']['revision'];

  // Notify field widgets.
  field_attach_submit('chatroom_echat', $chatroom_echat, $form, $form_state);

  // Save the chatroom_echat.
  chatroom_echat_save($chatroom_echat);

  // Notify the user.
  drupal_set_message(t('chatroom_echat saved.'));

  $form_state['redirect'] = 'chatroom_echat/' . $chatroom_echat->nid;
}


function chatroom_echat_form_delete_submit($form, &$form_state) {
  $destination = array();
  if (isset($_GET['destination'])) {
    $destination = drupal_get_destination();
    unset($_GET['destination']);
  }
  $chatroom_echat = $form['#chatroom_echat'];
  $form_state['redirect'] = array('chatroom_echat/' . $chatroom_echat->nid . '/delete', array('query' => $destination));
}

/**
 * Displays an chatroom_echat.
 *
 * @param $chatroom_echat
 *   The chatroom_echat object to display.
 * @param $view_mode
 *   The view mode we want to display.
 */
function chatroom_echat_page_view($chatroom_echat, $view_mode = 'full') {
  // Remove previously built content, if exists.
  $chatroom_echat->content = array();

  if ($view_mode == 'teaser') {
    $chatroom_echat->content['title'] = array(
      '#markup' => filter_xss($chatroom_echat->title),
      '#weight' => -5,
    );
  }

  // Build fields content.
  field_attach_prepare_view('chatroom_echat', array($chatroom_echat->nid => $chatroom_echat), $view_mode);
  entity_prepare_view('chatroom_echat', array($chatroom_echat->nid => $chatroom_echat));
  $chatroom_echat->content += field_attach_view('chatroom_echat', $chatroom_echat, $view_mode);
  
  return $chatroom_echat->content;
}

/**
 * Form bulder; Asks for confirmation of chatroom_echat deletion.
 */
function chatroom_echat_delete_confirm($form, &$form_state, $chatroom_echat) {
  $form['#chatroom_echat'] = $chatroom_echat;
  // Always provide entity id in the same form key as in the entity edit form.
  $form['nid'] = array('#type' => 'value', '#value' => $chatroom_echat->nid);
  return confirm_form($form,
    t('Are you sure you want to delete %title?', array('%title' => $chatroom_echat->title)),
    'chatroom_echat/' . $chatroom_echat->nid,
    t('This action cannot be undone.'),
    t('Delete'),
    t('Cancel')
  );
}

/**
 * Executes chatroom_echat deletion.
 */
function chatroom_echat_delete_confirm_submit($form, &$form_state) {
  if ($form_state['values']['confirm']) {
    $chatroom_echat = chatroom_echat_load($form_state['values']['nid']);
    chatroom_echat_delete($form_state['values']['nid']);
    watchdog('chatroom_echat', '@type: deleted %title.', array('@type' => $chatroom_echat->type, '%title' => $chatroom_echat->title));

    $types = chatroom_echat_types();
    drupal_set_message(t('@type %title has been deleted.', array('@type' => $types[$chatroom_echat->type]->name, '%title' => $chatroom_echat->title)));
  }

  $form_state['redirect'] = '<front>';
}

/**
 * Menu callback; Displays a listing of recent chatroom_echats.
 *
 * This doesn't really work yet because our presentation code doesn't show
 * the title.
 */
function chatroom_echat_page_list_recent() {
  $content = array();

  $query = new EntityFieldQuery();
  $query
    ->entityCondition('entity_type', 'chatroom_echat')
    ->propertyOrderBy('created', 'DESC')
    ->fieldCondition('field_artist', 'value', 'Da Vinci', 'CONTAINS', 0)
    ->range(0, 5);
  $result = $query->execute();

  $chatroom_echats = chatroom_echat_load_multiple(array_keys($result['chatroom_echat']));
  foreach ($chatroom_echats as $chatroom_echat) {
    $content[$chatroom_echat->nid] = chatroom_echat_page_view($chatroom_echat, 'teaser');
  }

  return $content;
}
