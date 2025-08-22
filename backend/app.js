const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const chatRoute = require("./routes/chatRoutes");

const app = express();

// MIDDLEWARE

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ================================
// ROUTES
// ================================

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CoPed Constitutional Pedia API Server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      chat: "/api/chat",
      health: "/api/health",
    },
  });
});

// API routes
app.use("/api/chat", chatRoute);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    status: "No Authentication Required",
  });
});

// ================================
// ERROR HANDLING
// ================================

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      "GET /",
      "GET /api/health",
      "POST /api/chat/rooms",
      "GET /api/chat/rooms",
      "POST /api/chat/ask",
    ],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔴 Error:", err.stack);

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ================================
// SERVER STARTUP
// ================================

const startServer = async () => {
  try {
    // Start server (no database needed for in-memory storage)
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log("🚀 ================================");
      console.log(`🚀 CoPed Backend Server Started!`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📍 Local URL: http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
      console.log(`✅ Authentication: DISABLED`);
      console.log(`💾 Storage: In-Memory (session-based)`);
      console.log("🚀 ================================");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("🔴 Unhandled Promise Rejection:", err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("🔴 Uncaught Exception:", err.message);
  process.exit(1);
});

// Start the server
startServer();
