const express = require("express");
const rateLimit = require("express-rate-limit");
const geminiService = require("../services/geminiServices");

const {
  createChatRoom,
  getChatRooms,
  getChatRoomMessages,
  deleteChatRoom,
  updateChatRoomTitle,
  processChatQuestion,
} = require("../controllers/chatController");

const router = express.Router();

// ================================
// RATE LIMITING MIDDLEWARE
// ================================

// Rate limiting: 60 requests per minute per IP
const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi dalam 1 menit",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// ================================
// CHAT ROOM MANAGEMENT ROUTES
// ================================

router.post("/rooms", createChatRoom);
router.get("/rooms", getChatRooms);
router.get("/rooms/:roomId/messages", getChatRoomMessages);
router.put("/rooms/:roomId", updateChatRoomTitle);
router.delete("/rooms/:roomId", deleteChatRoom);

// ================================
// RAG QUERY ROUTES (with rate limiting)
// ================================

/**
 * POST /api/chat/ask
 * Non-streaming query endpoint with LRU cache
 * Requirements: 2.3, 16.1, 16.2
 */
router.post("/ask", queryLimiter, async (req, res) => {
  try {
    const { question, ragType = "auto", model = "gemini-1.5-flash" } = req.body;

    // Validate question parameter
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Pertanyaan tidak boleh kosong",
      });
    }

    // Get client IP for logging
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Call geminiService.queryWithCache()
    const result = await geminiService.queryWithCache(
      question,
      ragType,
      model,
      req.ip,
      clientIP
    );

    // Return success response
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan saat memproses permintaan",
    });
  }
});

/**
 * GET /api/chat/ask/stream
 * Streaming query endpoint using SSE
 * Requirements: 2.4, 7.3, 16.1, 16.2
 */
router.get("/ask/stream", queryLimiter, async (req, res) => {
  try {
    const { question, ragType = "auto", model = "gemini-1.5-flash" } = req.query;

    // Validate question parameter from query string
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Pertanyaan tidak boleh kosong",
      });
    }

    // Call geminiService.queryStream()
    const response = await geminiService.queryStream(question, ragType, model);

    // Return stream URL for frontend
    res.json({
      success: true,
      streamUrl: response.streamUrl,
    });
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan saat memproses permintaan streaming",
    });
  }
});

/**
 * GET /api/chat/cache/stats
 * Get LRU cache statistics
 * Requirements: 12.2
 */
router.get("/cache/stats", (req, res) => {
  try {
    const stats = geminiService.getCacheStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Cache stats error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan saat mengambil statistik cache",
    });
  }
});

module.exports = router;
