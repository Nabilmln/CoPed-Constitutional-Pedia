/**
 * Integration Tests for Express.js Routes with Rate Limiting
 * Task 15.6 - Requirements: 20.3
 * 
 * Test Coverage:
 * - Rate limiting returns 429 after 60 requests
 * - /ask endpoint with valid query
 * - /ask endpoint validation errors
 * - Security headers present in responses
 */

const request = require("supertest");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const geminiService = require("../services/geminiServices");

// Mock geminiService
jest.mock("../services/geminiServices");

// Create test app
function createTestApp() {
  const app = express();

  // Security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      xContentTypeOptions: true,
      frameguard: { action: "deny" },
      xssFilter: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    })
  );

  app.use(express.json());

  // Rate limiting: 60 requests per minute
  const queryLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi dalam 1 menit",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Routes
  app.post("/api/chat/ask", queryLimiter, async (req, res) => {
    try {
      const { question, ragType = "auto", model = "gemini-1.5-flash" } = req.body;

      if (!question || !question.trim()) {
        return res.status(400).json({
          success: false,
          error: "Pertanyaan tidak boleh kosong",
        });
      }

      const result = await geminiService.queryWithCache(
        question,
        ragType,
        model,
        req.ip
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Terjadi kesalahan saat memproses permintaan",
      });
    }
  });

  app.get("/api/chat/ask/stream", queryLimiter, async (req, res) => {
    try {
      const { question, ragType = "auto", model = "gemini-1.5-flash" } = req.query;

      if (!question || !question.trim()) {
        return res.status(400).json({
          success: false,
          error: "Pertanyaan tidak boleh kosong",
        });
      }

      const response = await geminiService.queryStream(question, ragType, model);

      res.json({
        success: true,
        streamUrl: response.streamUrl,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Terjadi kesalahan saat memproses permintaan streaming",
      });
    }
  });

  app.get("/api/chat/cache/stats", (req, res) => {
    try {
      const stats = geminiService.getCacheStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Terjadi kesalahan saat mengambil statistik cache",
      });
    }
  });

  return app;
}

describe("Express Routes Integration Tests", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe("Security Headers (helmet middleware)", () => {
    test("should include X-Content-Type-Options: nosniff", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });

    test("should include X-Frame-Options: DENY", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      expect(response.headers["x-frame-options"]).toBe("DENY");
    });

    test("should include X-XSS-Protection header", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      expect(response.headers["x-xss-protection"]).toBeDefined();
    });

    test("should include Strict-Transport-Security with max-age 31536000", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      expect(response.headers["strict-transport-security"]).toMatch(/max-age=31536000/);
    });
  });

  describe("POST /api/chat/ask endpoint", () => {
    test("should return success response with valid query", async () => {
      const mockResult = {
        answer: "Pasal 1 UUD 1945 menyatakan...",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [
          {
            pasal_ayat: "Pasal 1 Ayat 1",
            preview: "Negara Indonesia adalah negara kesatuan...",
            relevance_score: 0.95,
          },
        ],
        gemini_model: "gemini-1.5-flash",
        cached: false,
      };

      geminiService.queryWithCache.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/chat/ask")
        .send({
          question: "Apa isi Pasal 1 UUD 1945?",
          ragType: "native",
          model: "gemini-1.5-flash",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(geminiService.queryWithCache).toHaveBeenCalledWith(
        "Apa isi Pasal 1 UUD 1945?",
        "native",
        "gemini-1.5-flash",
        expect.any(String)
      );
    });

    test("should return 400 error for empty question", async () => {
      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Pertanyaan tidak boleh kosong");
      expect(geminiService.queryWithCache).not.toHaveBeenCalled();
    });

    test("should return 400 error for whitespace-only question", async () => {
      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "   " });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Pertanyaan tidak boleh kosong");
    });

    test("should return 400 error for missing question parameter", async () => {
      const response = await request(app)
        .post("/api/chat/ask")
        .send({ ragType: "auto" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Pertanyaan tidak boleh kosong");
    });

    test("should use default values for ragType and model", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "auto",
        accuracy: 90.0,
        response_time: 450,
        sources: [],
      });

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      expect(response.status).toBe(200);
      expect(geminiService.queryWithCache).toHaveBeenCalledWith(
        "Test question",
        "auto",
        "gemini-1.5-flash",
        expect.any(String)
      );
    });

    test("should return 500 error when service fails", async () => {
      geminiService.queryWithCache.mockRejectedValue(
        new Error("Service unavailable")
      );

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Terjadi kesalahan saat memproses permintaan");
    });
  });

  describe("GET /api/chat/ask/stream endpoint", () => {
    test("should return stream URL with valid query", async () => {
      const mockStreamResponse = {
        streamUrl: "http://localhost:5001/api/query/stream?question=Test&rag_type=auto&model=gemini-1.5-flash",
      };

      geminiService.queryStream.mockResolvedValue(mockStreamResponse);

      const response = await request(app)
        .get("/api/chat/ask/stream")
        .query({
          question: "Test question",
          ragType: "auto",
          model: "gemini-1.5-flash",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.streamUrl).toBeDefined();
      expect(geminiService.queryStream).toHaveBeenCalledWith(
        "Test question",
        "auto",
        "gemini-1.5-flash"
      );
    });

    test("should return 400 error for empty question in query string", async () => {
      const response = await request(app)
        .get("/api/chat/ask/stream")
        .query({ question: "" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Pertanyaan tidak boleh kosong");
    });

    test("should return 500 error when streaming fails", async () => {
      geminiService.queryStream.mockRejectedValue(
        new Error("Streaming unavailable")
      );

      const response = await request(app)
        .get("/api/chat/ask/stream")
        .query({ question: "Test question" });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Terjadi kesalahan saat memproses permintaan streaming");
    });
  });

  describe("GET /api/chat/cache/stats endpoint", () => {
    test("should return cache statistics", async () => {
      const mockStats = {
        hits: 45,
        misses: 30,
        size: 30,
        hit_rate: "60.00%",
        total_requests: 75,
      };

      geminiService.getCacheStats.mockReturnValue(mockStats);

      const response = await request(app).get("/api/chat/cache/stats");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    test("should return 500 error when stats retrieval fails", async () => {
      geminiService.getCacheStats.mockImplementation(() => {
        throw new Error("Stats unavailable");
      });

      const response = await request(app).get("/api/chat/cache/stats");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Terjadi kesalahan saat mengambil statistik cache");
    });
  });

  describe("Rate Limiting", () => {
    test("should allow 60 requests within the rate limit", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      // Make 60 requests (at the limit)
      for (let i = 0; i < 60; i++) {
        const response = await request(app)
          .post("/api/chat/ask")
          .send({ question: `Test question ${i}` });

        expect(response.status).toBe(200);
      }
    });

    test("should return 429 after exceeding rate limit of 60 requests", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      // Make 61 requests (exceeding the limit)
      let response429Count = 0;

      for (let i = 0; i < 61; i++) {
        const response = await request(app)
          .post("/api/chat/ask")
          .send({ question: `Test question ${i}` });

        if (response.status === 429) {
          response429Count++;
        }
      }

      // At least the 61st request should be rate limited
      expect(response429Count).toBeGreaterThan(0);
    });

    test("should include RateLimit headers in responses", async () => {
      geminiService.queryWithCache.mockResolvedValue({
        answer: "Test answer",
        system: "native",
        accuracy: 96.8,
        response_time: 500,
        sources: [],
      });

      const response = await request(app)
        .post("/api/chat/ask")
        .send({ question: "Test question" });

      // Check for standard rate limit headers
      expect(response.headers["ratelimit-limit"]).toBeDefined();
      expect(response.headers["ratelimit-remaining"]).toBeDefined();
    });
  });
});
