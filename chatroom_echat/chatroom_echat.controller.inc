<?php

/**
 * Controller for loading, creating, and saving chatrooms.
 *
 * The default loader, which we extend, handles load() already. We only
 * need to add saving and creating.
 */
class ChatroomController extends DrupalDefaultEntityController {

  public function save($chatroom) {
    $transaction = db_transaction();

    try {
      global $user;

      // Determine if we will be inserting a new chatroom.
      $chatroom->is_new = empty($chatroom->nid);

      // Set the timestamp fields.
      if (empty($chatroom->created)) {
        $chatroom->created = REQUEST_TIME;
      }
      $chatroom->changed = REQUEST_TIME;

      $chatroom->revision_timestamp = REQUEST_TIME;
      $update_chatroom = TRUE;

      // Give modules the opportunity to prepare field data for saving.
      field_attach_presave('chatroom', $chatroom);

      // When saving a new chatroom revision, unset any existing $chatroom->vid
      // to ensure a new revision will actually be created and store the old
      // revision ID in a separate property for chatroom hook implementations.
      if (!$chatroom->is_new && !empty($chatroom->revision) && $chatroom->vid) {
        $chatroom->old_vid = $chatroom->vid;
        unset($chatroom->vid);
      }

      // If this is a new chatroom...
      if ($chatroom->is_new) {
        // Save the new chatroom.
        drupal_write_record('chatroom', $chatroom);

        // Save the initial revision.
        $this->saveRevision($chatroom, $user->uid);

        $op = 'insert';
      }
      else {
        // Save the updated chatroom.
        drupal_write_record('chatroom', $chatroom, 'nid');

        // If a new chatroom revision was requested, save a new record for that;
        // otherwise, update the chatroom revision record that matches the value
        // of $chatroom->vid.
        if (!empty($chatroom->revision)) {
          $this->saveRevision($chatroom, $user->uid);
        }
        else {
          $this->saveRevision($chatroom, $user->uid, TRUE);
          $update_chatroom = FALSE;
        }

        $op = 'update';
      }

      // If the revision ID is new or updated, save it to the chatroom.
      if ($update_chatroom) {
        db_update('chatroom')
          ->fields(array('vid' => $chatroom->vid))
          ->condition('nid', $chatroom->nid)
          ->execute();
      }

      // Save fields.
      $function = 'field_attach_' . $op;
      $function('chatroom', $chatroom);

      module_invoke_all('entity_' . $op, $chatroom, 'chatroom');

      // Clear internal properties.
      unset($chatroom->is_new);

      // Ignore slave server temporarily to give time for the saved order to be
      // propagated to the slave.
      db_ignore_slave();

      return $chatroom;
    }
    catch (Exception $e) {
      $transaction->rollback();
      watchdog_exception('chatroom', $e, NULL, WATCHDOG_ERROR);
      return FALSE;
    }
  }

  /**
   * Saves an chatroom revision with the uid of the current user.
   *
   * @param $chatroom
   *   The fully loaded chatroom object.
   * @param $uid
   *   The user's uid for the current revision.
   * @param $update
   *   TRUE or FALSE indicating whether or not the existing revision should be
   *     updated instead of a new one created.
   */
  function saveRevision($chatroom, $uid, $update = FALSE) {
    // Hold on to the chatroom's original creator_uid but swap in the revision's
    // creator_uid for the momentary write.
    $temp_uid = $chatroom->uid;
    $chatroom->uid = $uid;

    // Update the existing revision if specified.
    if ($update) {
      drupal_write_record('chatroom_revision', $chatroom, 'vid');
    }
    else {
      // Otherwise insert a new revision. This will automatically update $chatroom
      // to include the vid.
      drupal_write_record('chatroom_revision', $chatroom);
    }

    // Reset the order's creator_uid to the original value.
    $chatroom->uid = $temp_uid;
 }

  /**
   * Deletes multiple chatrooms by ID.
   *
   * @param $nids
   *   An array of chatroom IDs to delete.
   * @return
   *   TRUE on success, FALSE otherwise.
   */
  public function delete($nids) {
    if (!empty($nids)) {
      $chatrooms = $this->load($nids, array());

      $transaction = db_transaction();

      try {
        db_delete('chatroom')
          ->condition('nid', $nids, 'IN')
          ->execute();

        db_delete('chatroom_revision')
          ->condition('nid', $nids, 'IN')
          ->execute();

        foreach ($chatrooms as $chatroom_id => $chatroom) {
          field_attach_delete('chatroom', $chatroom);
        }

        // Ignore slave server temporarily to give time for the
        // saved chatroom to be propagated to the slave.
        db_ignore_slave();
      }
      catch (Exception $e) {
        $transaction->rollback();
        watchdog_exception('chatroom', $e, NULL, WATCHDOG_ERROR);
        return FALSE;
      }

      module_invoke_all('entity_delete', $chatroom, 'chatroom');

      // Clear the page and block and chatroom caches.
      cache_clear_all();
      $this->resetCache();
    }

    return TRUE;
  }

  /**
   * Create a default chatroom.
   *
   * @param $type
   *   The machine-readable type of the chatroom.
   *
   * @return
   *   An chatroom object with all default fields initialized.
   */
  public function create($type = '') {
    return (object) array(
      'nid' => '',
      'type' => $type,
      'title' => '',
    );
  }
}
