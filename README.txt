$Id$

This version of the project is for developers only. It is not intended for
production use. We are working on spontaneous chat and node-based chat. When
the code becomes stable, it may be split into separate projects.

Usage
=====


Files
=====

INSTALL.txt
Installation instructions.

README.txt
Usage instructions and file descriptions.


Chat Api
--------
A common foundation for chat modules.

chat_invite.info
Module information.

chat_invite.install
Add user status and invitation filter tables.

chat_invite.js
Client functions for invitation exchange.

chat_invite.module
Server functions for invitation exchange.

chat_message.js
Client functions for message display.


Spontaneous Chat
----------------
Allow users to send each other instant messages.

spontaneous_chat.css
Styles for spontaneous chat display.

spontaneous_chat.info
Module information.

spontaneous_chat.js
Client and peer-to-peer functions for spontaneous chat.

spontaneous_chat.module
Server functions and user interface for spontaneous chat.


Node Chat
---------
Add chat to any node.

node_chat.info
Module information.

node_chat.install
Add modification time column to comment table.

node_chat.js
Client functions for node chat.

node_chat.module
Server functions for node chat. Store, retrieve, and delete comments.


Chatroom
--------
A forum topic with new comments displayed in real time.

chatroom.css
Styles for chatroom display.

chatroom.info
Module information.

chatroom.install
Add table for the chatroom content type.
Uninstall the chatroom module.

chatroom.module
Chatroom content type.
