const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

// Import services
const healthMonitor = require("./services/healthMonitor");
const logger = require("./services/logger");

// Import routes
const chatRoute = require("./routes/chatRoutes");

const app = express();

// MIDDLEWARE

// Security headers with helmet middleware
// Requirements: 16.3, 16.4, 16.5, 16.6, 16.7
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow frontend to work
    xContentTypeOptions: true, // X-Content-Type-Options: nosniff
    frameguard: { action: "deny" }, // X-Frame-Options: DENY
    xssFilter: true, // X-XSS-Protection: 1; mode=block
    hsts: {
      maxAge: 31536000, // Strict-Transport-Security: max-age=31536000
      includeSubDomains: true,
    },
  })
);

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
  const clientIP = req.ip || req.connection.remoteAddress;
  logger.info('RequestHandler', `${req.method} ${req.path}`, {
    clientIP,
    userAgent: req.get('user-agent'),
  });
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
app.get("/api/health", async (req, res) => {
  const healthStatus = healthMonitor.getStatus();
  
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    healthMonitor: {
      fastAPIStatus: healthStatus.isInFallbackMode ? 'unhealthy' : 'healthy',
      isInFallbackMode: healthStatus.isInFallbackMode,
      consecutiveFailures: healthStatus.consecutiveFailures,
      lastHealthCheck: healthStatus.lastHealthCheckTime,
      stats: healthStatus.stats,
    },
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
  // Log error with stack trace (Requirements: 19.6)
  logger.logError(err, {
    component: 'GlobalErrorHandler',
    path: req.path,
    method: req.method,
  });

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
      logger.info('Server', 'CoPed Backend Server Started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:5001',
      });

      console.log("🚀 ================================");
      console.log(`🚀 CoPed Backend Server Started!`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📍 Local URL: http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
      console.log(`✅ Authentication: DISABLED`);
      console.log(`💾 Storage: In-Memory (session-based)`);
      console.log("🚀 ================================");

      // Start health monitoring (Requirements: 17.5, 17.6)
      logger.info('Server', 'Starting health monitor');
      healthMonitor.start();
    });
  } catch (error) {
    logger.logError(error, {
      component: 'Server',
      message: 'Failed to start server',
    });
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  logger.critical('Process', 'Unhandled Promise Rejection', {
    error: err.message,
    stack: err.stack,
  });
  
  // Stop health monitor before exit
  healthMonitor.stop();
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.critical('Process', 'Uncaught Exception', {
    error: err.message,
    stack: err.stack,
  });
  
  // Stop health monitor before exit
  healthMonitor.stop();
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info('Process', 'SIGTERM received, shutting down gracefully');
  healthMonitor.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info('Process', 'SIGINT received, shutting down gracefully');
  healthMonitor.stop();
  process.exit(0);
});

// Start the server
startServer();
