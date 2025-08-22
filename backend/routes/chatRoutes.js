const express = require("express");

const {
  createChatRoom,
  getChatRooms,
  getChatRoomMessages,
  deleteChatRoom,
  updateChatRoomTitle,
  processChatQuestion,
} = require("../controllers/chatController");

const router = express.Router();

// Chat room management
router.post("/rooms", createChatRoom);
router.get("/rooms", getChatRooms);
router.get("/rooms/:roomId/messages", getChatRoomMessages);
router.put("/rooms/:roomId", updateChatRoomTitle);
router.delete("/rooms/:roomId", deleteChatRoom);

// RAG processing
router.post("/ask", processChatQuestion);

module.exports = router;
