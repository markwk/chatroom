<?php

/**
 * Menu callback; List all chatroom_echat types available.
 */
function chatroom_echat_overview_types() {
  foreach (chatroom_echat_types() as $type => $info) {
    $type_url_str = str_replace('_', '-', $type);
    $label = t('View @type', array('@type' => $info->name));
    $items[] = l($label, 'admin/structure/chatroom_echat/manage/' . $type_url_str);
  }

  return theme('item_list', array('items' => $items));
}

/**
 * Menu callback; chatroom_echat information page.
 *
 * @param object $chatroom_echat_type
 */
function chatroom_echat_information($chatroom_echat_type) {
  return $chatroom_echat_type->name . ': ' . $chatroom_echat_type->description;
}
