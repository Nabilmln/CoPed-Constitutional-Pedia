const { v4: uuidv4 } = require("uuid");
const geminiService = require("../services/geminiServices");
const legalContextValidator = require("../utils/legalValidator");

// In-memory storage for chat rooms (untuk testing, production bisa gunakan database)
let chatRooms = [];

// Helper function to generate smart titles based on question content
const generateSmartTitle = (question) => {
  // Constitutional keywords mapping
  const constitutionalKeywords = {
    "pasal 1": "Pasal 1 - Bentuk Negara",
    "pasal 2": "Pasal 2 - MPR dan Kedaulatan",
    "pasal 3": "Pasal 3 - Kekuasaan MPR",
    "kedaulatan rakyat": "Kedaulatan Rakyat",
    kedaulatan: "Kedaulatan dalam UUD 1945",
    "hak asasi manusia": "HAM dalam UUD 1945",
    "hak asasi": "Hak Asasi Manusia",
    presiden: "Sistem Presidensial",
    mpr: "MPR dan Lembaga Negara",
    dpr: "DPR dan Legislatif",
    "mahkamah konstitusi": "Mahkamah Konstitusi",
    "mahkamah agung": "Mahkamah Agung",
    "sistem pemerintahan": "Sistem Pemerintahan Indonesia",
    "pembukaan uud": "Pembukaan UUD 1945",
    pancasila: "Pancasila dalam UUD 1945",
    "negara kesatuan": "Negara Kesatuan Republik Indonesia",
    republik: "Bentuk Republik Indonesia",
    demokrasi: "Demokrasi Indonesia",
    pemilu: "Pemilihan Umum",
    "otonomi daerah": "Otonomi Daerah",
    amandemen: "Amandemen UUD 1945",
  };

  const questionLower = question.toLowerCase();

  // Check for exact keyword matches
  for (const [keyword, title] of Object.entries(constitutionalKeywords)) {
    if (questionLower.includes(keyword)) {
      return title;
    }
  }

  // If no keywords found, use question itself with smart truncation
  if (question.length > 50) {
    // Try to cut at word boundary
    const truncated = question.substring(0, 47);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 20
      ? truncated.substring(0, lastSpace) + "..."
      : truncated + "...";
  }

  return question;
};

// @desc    Create new chat room
// @route   POST /api/chat/rooms
// @access  Public
exports.createChatRoom = async (req, res) => {
  try {
    const { title } = req.body;

    console.log("Creating new chat room with title:", title);

    // Create new room
    const newRoom = {
      roomId: uuidv4(),
      title: title || `Chat Room ${Date.now()}`,
      messages: [],
      isActive: true,
      lastActivity: new Date(),
    };

    chatRooms.push(newRoom);

    console.log("Chat room created successfully:", newRoom.roomId);

    res.status(201).json({
      success: true,
      message: "Chat room created successfully",
      data: {
        room: newRoom,
      },
    });
  } catch (error) {
    console.error("Create chat room error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating chat room",
      error: error.message,
    });
  }
};

// @desc    Get all chat rooms
// @route   GET /api/chat/rooms
// @access  Public
exports.getChatRooms = async (req, res) => {
  try {
    const { limit = 10, active = true } = req.query;

    console.log("Getting chat rooms");

    // Filter active rooms if requested
    let rooms =
      active === "true" ? chatRooms.filter((room) => room.isActive) : chatRooms;

    // Sort by last activity
    rooms.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    // Limit results
    rooms = rooms.slice(0, parseInt(limit));

    // Add message count to each room
    const roomsWithStats = rooms.map((room) => ({
      ...room,
      messageCount: room.messages ? room.messages.length : 0,
      lastMessage:
        room.messages && room.messages.length > 0
          ? room.messages[room.messages.length - 1]
          : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        rooms: roomsWithStats,
        total: chatRooms.length,
      },
    });
  } catch (error) {
    console.error("Get chat rooms error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting chat rooms",
      error: error.message,
    });
  }
};

// @desc    Get chat room messages
// @route   GET /api/chat/rooms/:roomId/messages
// @access  Public
exports.getChatRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    console.log("Getting messages for room:", roomId);

    const room = chatRooms.find((room) => room.roomId === roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const messages = room.messages || [];
    const sortedMessages = messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        room: {
          roomId: room.roomId,
          title: room.title,
          isActive: room.isActive,
          lastActivity: room.lastActivity,
        },
        messages: sortedMessages,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(messages.length / limit),
          hasNext: endIndex < messages.length,
          hasPrev: startIndex > 0,
        },
      },
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting chat messages",
      error: error.message,
    });
  }
};

// @desc    Process chat question with real RAG
// @route   POST /api/chat/ask
// @access  Public
exports.processChatQuestion = async (req, res) => {
  try {
    const { question, roomId, ragSystem = "auto" } = req.body;

    console.log("Processing question:", question, "using system:", ragSystem);

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    // Validate legal context before processing
    const validationResult = legalContextValidator.isLegalContext(
      question.trim()
    );
    console.log("Legal context validation:", validationResult);

    if (!validationResult.isValid) {
      const rejectionResponse =
        legalContextValidator.generateRejectionResponse(validationResult);

      // Still save to chat history if roomId provided (for learning/audit purposes)
      if (roomId) {
        const roomIndex = chatRooms.findIndex((room) => room.roomId === roomId);
        if (roomIndex !== -1) {
          const rejectionMessage = {
            question: question.trim(),
            answer: rejectionResponse.answer,
            ragSystem: rejectionResponse.system,
            accuracy: rejectionResponse.accuracy,
            responseTime: rejectionResponse.responseTime,
            sources: rejectionResponse.sources,
            geminiModel: rejectionResponse.geminiModel,
            isError: rejectionResponse.isError,
            errorMessage: rejectionResponse.errorMessage,
            createdAt: new Date(),
            validationReason: rejectionResponse.validationReason,
            contextScore: rejectionResponse.contextScore,
          };

          chatRooms[roomIndex].messages.push(rejectionMessage);
          chatRooms[roomIndex].lastActivity = new Date();

          // Update room title for non-legal questions
          if (
            chatRooms[roomIndex].messages.length === 1 &&
            (chatRooms[roomIndex].title === "Chat Baru" ||
              chatRooms[roomIndex].title.startsWith("Chat Room"))
          ) {
            chatRooms[roomIndex].title = "🏛️ Konsultasi di Luar Bidang Hukum";
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: "Pertanyaan berhasil diproses - konteks non-hukum",
        data: {
          question: question.trim(),
          answer: rejectionResponse.answer,
          system: rejectionResponse.system,
          accuracy: rejectionResponse.accuracy,
          responseTime: rejectionResponse.responseTime,
          sources: rejectionResponse.sources,
          geminiModel: rejectionResponse.geminiModel,
          roomId: roomId || null,
          isError: false,
          errorMessage: rejectionResponse.errorMessage,
          validationReason: rejectionResponse.validationReason,
          contextScore: rejectionResponse.contextScore,
          legalContextRequired: true,
          isLegalContextRejection: true,
        },
      });
    }

    const startTime = Date.now();
    let result;

    try {
      // Call appropriate RAG system based on selection
      switch (ragSystem) {
        case "native":
          result = await geminiService.callNativeRAG(question, "anonymous");
          break;
        case "langchain":
          result = await geminiService.callLangChainRAG(question, "anonymous");
          break;
        case "auto":
        default:
          result = await geminiService.autoSelectRAG(question, "anonymous");
          break;
      }
    } catch (ragError) {
      console.error("RAG system error:", ragError);

      // Fallback response if RAG fails
      result = {
        answer: `Maaf, terjadi kesalahan pada sistem RAG. Namun berdasarkan pertanyaan "${question}", saya dapat memberikan informasi umum bahwa ini berkaitan dengan aspek konstitusional Indonesia. Silakan coba lagi atau hubungi administrator.`,
        system: ragSystem,
        accuracy: 0,
        responseTime: Date.now() - startTime,
        sources: [],
        geminiModel: "fallback",
        error: true,
        errorMessage: ragError.message,
      };
    }

    const responseTime = Date.now() - startTime;

    // If roomId provided, save to chat history
    if (roomId) {
      const roomIndex = chatRooms.findIndex((room) => room.roomId === roomId);
      if (roomIndex !== -1) {
        const newMessage = {
          question: question.trim(),
          answer: result.answer,
          ragSystem: result.system,
          accuracy: result.accuracy,
          responseTime: result.responseTime || responseTime,
          sources: result.sources || [],
          geminiModel: result.geminiModel,
          isError: result.error || false,
          errorMessage: result.errorMessage || null,
          createdAt: new Date(),
        };

        chatRooms[roomIndex].messages.push(newMessage);
        chatRooms[roomIndex].lastActivity = new Date();

        // Auto-update room title if it's still default and this is the first message
        if (
          chatRooms[roomIndex].messages.length === 1 &&
          (chatRooms[roomIndex].title === "Chat Baru" ||
            chatRooms[roomIndex].title.startsWith("Chat Room"))
        ) {
          const smartTitle = generateSmartTitle(question.trim());
          chatRooms[roomIndex].title = smartTitle;
          console.log(`Room title auto-updated to: ${smartTitle}`);
        }

        console.log("Message saved to room:", roomId);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        question: question.trim(),
        answer: result.answer,
        system: result.system,
        accuracy: result.accuracy,
        responseTime: result.responseTime || responseTime,
        sources: result.sources || [],
        geminiModel: result.geminiModel,
        roomId: roomId || null,
        cached: false,
        isError: result.error || false,
        errorMessage: result.errorMessage || null,
        autoSelected: result.autoSelected || false,
      },
    });
  } catch (error) {
    console.error("Process chat question error:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing question",
      error: error.message,
    });
  }
};

// @desc    Update chat room title
// @route   PUT /api/chat/rooms/:roomId
// @access  Public
exports.updateChatRoomTitle = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title } = req.body;

    console.log("Updating chat room title:", roomId, "to:", title);

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const roomIndex = chatRooms.findIndex((room) => room.roomId === roomId);
    if (roomIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    chatRooms[roomIndex].title = title.trim();

    console.log("Chat room title updated successfully:", roomId);

    res.status(200).json({
      success: true,
      message: "Chat room title updated successfully",
      data: {
        room: chatRooms[roomIndex],
      },
    });
  } catch (error) {
    console.error("Update chat room title error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating chat room title",
      error: error.message,
    });
  }
};

// @desc    Delete chat room
// @route   DELETE /api/chat/rooms/:roomId
// @access  Public
exports.deleteChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log("Deleting chat room:", roomId);

    const roomIndex = chatRooms.findIndex((room) => room.roomId === roomId);
    if (roomIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Mark as inactive instead of deleting
    chatRooms[roomIndex].isActive = false;

    console.log("Chat room deleted successfully:", roomId);

    res.status(200).json({
      success: true,
      message: "Chat room deleted successfully",
    });
  } catch (error) {
    console.error("Delete chat room error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting chat room",
      error: error.message,
    });
  }
};
