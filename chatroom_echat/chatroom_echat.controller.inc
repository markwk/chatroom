<?php

/**
 * Controller for loading, creating, and saving chatroom_echats.
 *
 * The default loader, which we extend, handles load() already. We only
 * need to add saving and creating.
 */
class ChatroomEchatController extends DrupalDefaultEntityController {

  public function save($chatroom_echat) {
    $transaction = db_transaction();

    try {
      global $user;

      // Determine if we will be inserting a new chatroom_echat.
      $chatroom_echat->is_new = empty($chatroom_echat->nid);

      // Set the timestamp fields.
      if (empty($chatroom_echat->created)) {
        $chatroom_echat->created = REQUEST_TIME;
      }
      $chatroom_echat->changed = REQUEST_TIME;

      $chatroom_echat->revision_timestamp = REQUEST_TIME;
      $update_chatroom_echat = TRUE;

      // Give modules the opportunity to prepare field data for saving.
      field_attach_presave('chatroom_echat', $chatroom_echat);

      // When saving a new chatroom_echat revision, unset any existing $chatroom_echat->vid
      // to ensure a new revision will actually be created and store the old
      // revision ID in a separate property for chatroom_echat hook implementations.
      if (!$chatroom_echat->is_new && !empty($chatroom_echat->revision) && $chatroom_echat->vid) {
        $chatroom_echat->old_vid = $chatroom_echat->vid;
        unset($chatroom_echat->vid);
      }

      // If this is a new chatroom_echat...
      if ($chatroom_echat->is_new) {
        // Save the new chatroom_echat.
        drupal_write_record('chatroom_echat', $chatroom_echat);

        // Save the initial revision.
        $this->saveRevision($chatroom_echat, $user->uid);

        $op = 'insert';
      }
      else {
        // Save the updated chatroom_echat.
        drupal_write_record('chatroom_echat', $chatroom_echat, 'nid');

        // If a new chatroom_echat revision was requested, save a new record for that;
        // otherwise, update the chatroom_echat revision record that matches the value
        // of $chatroom_echat->vid.
        if (!empty($chatroom_echat->revision)) {
          $this->saveRevision($chatroom_echat, $user->uid);
        }
        else {
          $this->saveRevision($chatroom_echat, $user->uid, TRUE);
          $update_chatroom_echat = FALSE;
        }

        $op = 'update';
      }

      // If the revision ID is new or updated, save it to the chatroom_echat.
      if ($update_chatroom_echat) {
        db_update('chatroom_echat')
          ->fields(array('vid' => $chatroom_echat->vid))
          ->condition('nid', $chatroom_echat->nid)
          ->execute();
      }

      // Save fields.
      $function = 'field_attach_' . $op;
      $function('chatroom_echat', $chatroom_echat);

      module_invoke_all('entity_' . $op, $chatroom_echat, 'chatroom_echat');

      // Clear internal properties.
      unset($chatroom_echat->is_new);

      // Ignore slave server temporarily to give time for the saved order to be
      // propagated to the slave.
      db_ignore_slave();

      return $chatroom_echat;
    }
    catch (Exception $e) {
      $transaction->rollback();
      watchdog_exception('chatroom_echat', $e, NULL, WATCHDOG_ERROR);
      return FALSE;
    }
  }

  /**
   * Saves an chatroom_echat revision with the uid of the current user.
   *
   * @param $chatroom_echat
   *   The fully loaded chatroom_echat object.
   * @param $uid
   *   The user's uid for the current revision.
   * @param $update
   *   TRUE or FALSE indicating whether or not the existing revision should be
   *     updated instead of a new one created.
   */
  function saveRevision($chatroom_echat, $uid, $update = FALSE) {
    // Hold on to the chatroom_echat's original creator_uid but swap in the revision's
    // creator_uid for the momentary write.
    $temp_uid = $chatroom_echat->uid;
    $chatroom_echat->uid = $uid;

    // Update the existing revision if specified.
    if ($update) {
      drupal_write_record('chatroom_echat_revision', $chatroom_echat, 'vid');
    }
    else {
      // Otherwise insert a new revision. This will automatically update $chatroom_echat
      // to include the vid.
      drupal_write_record('chatroom_echat_revision', $chatroom_echat);
    }

    // Reset the order's creator_uid to the original value.
    $chatroom_echat->uid = $temp_uid;
 }

  /**
   * Deletes multiple chatroom_echats by ID.
   *
   * @param $nids
   *   An array of chatroom_echat IDs to delete.
   * @return
   *   TRUE on success, FALSE otherwise.
   */
  public function delete($nids) {
    if (!empty($nids)) {
      $chatroom_echats = $this->load($nids, array());

      $transaction = db_transaction();

      try {
        db_delete('chatroom_echat')
          ->condition('nid', $nids, 'IN')
          ->execute();

        db_delete('chatroom_echat_revision')
          ->condition('nid', $nids, 'IN')
          ->execute();

        foreach ($chatroom_echats as $chatroom_echat_id => $chatroom_echat) {
          field_attach_delete('chatroom_echat', $chatroom_echat);
        }

        // Ignore slave server temporarily to give time for the
        // saved chatroom_echat to be propagated to the slave.
        db_ignore_slave();
      }
      catch (Exception $e) {
        $transaction->rollback();
        watchdog_exception('chatroom_echat', $e, NULL, WATCHDOG_ERROR);
        return FALSE;
      }

      module_invoke_all('entity_delete', $chatroom_echat, 'chatroom_echat');

      // Clear the page and block and chatroom_echat caches.
      cache_clear_all();
      $this->resetCache();
    }

    return TRUE;
  }

  /**
   * Create a default chatroom_echat.
   *
   * @param $type
   *   The machine-readable type of the chatroom_echat.
   *
   * @return
   *   An chatroom_echat object with all default fields initialized.
   */
  public function create($type = '') {
    return (object) array(
      'nid' => '',
      'type' => $type,
      'title' => '',
    );
  }
}
