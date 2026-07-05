/**
 * Integration tests for Node backend service with FastAPI interaction
 * Tests Requirements: 20.3
 * 
 * These tests verify the complete flow of:
 * - queryWithCache successful flow with FastAPI available
 * - Fallback mechanism when FastAPI unavailable
 * - Cache statistics calculation across multiple queries
 * - End-to-end integration of queryWithCache, fallbackDirectGemini, and getCacheStats
 */

const crypto = require("crypto");

// Mock environment variables before any imports
process.env.PYTHON_SERVICE_URL = "http://localhost:5001";
process.env.CACHE_TTL = "3600";
process.env.CACHE_MAX_SIZE = "100";
process.env.GEMINI_API_KEY = "test-api-key-for-integration";

// Mock axios before requiring the service
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
  defaults: {
    baseURL: "http://localhost:5001",
  },
  interceptors: {
    response: {
      use: jest.fn(),
    },
  },
};

jest.mock("axios", () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

jest.mock("@google/generative-ai");
jest.mock("http", () => ({
  Agent: jest.fn(),
}));

describe("GeminiService Integration Tests", () => {
  let geminiService;
  let GoogleGenerativeAI;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    jest.clearAllMocks();

    // Reset mock implementations
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.get.mockReset();

    // Require the service after mocks are set up
    geminiService = require("../services/geminiServices");

    // Get the mocked GoogleGenerativeAI
    GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Integration Test: queryWithCache successful flow", () => {
    test("should successfully query FastAPI, cache result, and return on second call", async () => {
      // Arrange
      const question = "Apa isi Pasal 1 UUD 1945?";
      const ragType = "native";
      const model = "gemini-1.5-flash";

      const mockFastAPIResponse = {
        data: {
          answer: "Pasal 1 UUD 1945 menyatakan bahwa Negara Indonesia adalah Negara Kesatuan yang berbentuk Republik.",
          system: "native",
          accuracy: 96.8,
          response_time: 850,
          sources: [
            {
              pasal_ayat: "Pasal 1 Ayat 1",
              preview: "Negara Indonesia ialah Negara Kesatuan yang berbentuk Republik...",
              relevance_score: 0.95,
              chunk_id: 12,
            },
          ],
          gemini_model: model,
          cached: false,
          fallback: false,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockFastAPIResponse);

      // Act - First call (should hit FastAPI)
      const firstResult = await geminiService.queryWithCache(
        question,
        ragType,
        model
      );

      // Assert - First call
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/query", {
        question,
        rag_type: ragType,
        model,
      });
      expect(firstResult.cached).toBe(false);
      expect(firstResult.answer).toBe(mockFastAPIResponse.data.answer);
      expect(firstResult.system).toBe("native");
      expect(firstResult.accuracy).toBe(96.8);
      expect(firstResult.sources).toHaveLength(1);

      // Act - Second call (should hit cache)
      const secondResult = await geminiService.queryWithCache(
        question,
        ragType,
        model
      );

      // Assert - Second call (cache hit)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(secondResult.cached).toBe(true);
      expect(secondResult.answer).toBe(firstResult.answer);
      expect(secondResult.system).toBe(firstResult.system);
      expect(secondResult.sources).toEqual(firstResult.sources);
    });

    test("should handle different RAG types correctly", async () => {
      // Arrange
      const question = "Test question for RAG types";

      const nativeResponse = {
        data: {
          answer: "Native RAG answer",
          system: "native",
          accuracy: 96.8,
          response_time: 800,
          sources: [],
          gemini_model: "gemini-2.5-flash",
        },
      };

      const langchainResponse = {
        data: {
          answer: "LangChain RAG answer",
          system: "langchain",
          accuracy: 89.2,
          response_time: 900,
          sources: [],
          gemini_model: "gemini-1.5-flash",
        },
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce(nativeResponse)
        .mockResolvedValueOnce(langchainResponse);

      // Act
      const nativeResult = await geminiService.queryWithCache(
        question,
        "native",
        "gemini-2.5-flash"
      );
      const langchainResult = await geminiService.queryWithCache(
        question,
        "langchain",
        "gemini-1.5-flash"
      );

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(nativeResult.system).toBe("native");
      expect(nativeResult.accuracy).toBe(96.8);
      expect(langchainResult.system).toBe("langchain");
      expect(langchainResult.accuracy).toBe(89.2);
    });

    test("should send correct request payload to FastAPI", async () => {
      // Arrange
      const question = "Constitutional question";
      const ragType = "auto";
      const model = "gemini-2.0-flash";

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          answer: "Auto-selected answer",
          system: "auto_selected",
          accuracy: 90.0,
          response_time: 750,
          sources: [],
          gemini_model: model,
        },
      });

      // Act
      await geminiService.queryWithCache(question, ragType, model);

      // Assert - Verify correct payload structure
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/query", {
        question,
        rag_type: ragType,
        model,
      });
    });

    test("should preserve source references from FastAPI response", async () => {
      // Arrange
      const sources = [
        {
          pasal_ayat: "Pasal 1 Ayat 1",
          preview: "Negara Indonesia ialah Negara Kesatuan...",
          relevance_score: 0.95,
          chunk_id: 1,
        },
        {
          pasal_ayat: "Pasal 1 Ayat 2",
          preview: "Kedaulatan berada di tangan rakyat...",
          relevance_score: 0.88,
          chunk_id: 2,
        },
      ];

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          answer: "Answer with multiple sources",
          system: "native",
          accuracy: 96.8,
          response_time: 900,
          sources,
          gemini_model: "gemini-1.5-flash",
        },
      });

      // Act
      const result = await geminiService.queryWithCache(
        "Question",
        "native",
        "gemini-1.5-flash"
      );

      // Assert
      expect(result.sources).toHaveLength(2);
      expect(result.sources).toEqual(sources);
      expect(result.sources[0].pasal_ayat).toBe("Pasal 1 Ayat 1");
      expect(result.sources[1].relevance_score).toBe(0.88);
    });
  });

  describe("Integration Test: Fallback when FastAPI unavailable", () => {
    beforeEach(() => {
      // Setup GoogleGenerativeAI mock for fallback tests
      GoogleGenerativeAI.mockImplementation((apiKey) => ({
        getGenerativeModel: jest.fn((config) => ({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => "Fallback answer from direct Gemini API",
            },
          }),
        })),
      }));
    });

    test("should fallback to direct Gemini when FastAPI service unavailable", async () => {
      // Arrange
      const question = "Test fallback question";
      const model = "gemini-1.5-flash";

      // Mock FastAPI failure
      mockAxiosInstance.post.mockRejectedValue(
        new Error("connect ECONNREFUSED 127.0.0.1:5001")
      );

      // Act
      const result = await geminiService.queryWithCache(question, "native", model);

      // Assert
      expect(result.fallback).toBe(true);
      expect(result.system).toBe("fallback_direct");
      expect(result.answer).toBe("Fallback answer from direct Gemini API");
      expect(result.gemini_model).toBe(model);
      expect(result.accuracy).toBe(75.0);
      expect(result.sources).toEqual([]);
      expect(result.cached).toBe(false);
      expect(result.note).toContain("FastAPI service tidak tersedia");
    });

    test("should fallback when FastAPI returns 500 error", async () => {
      // Arrange
      const question = "Test error handling";

      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 500,
          data: { detail: "Internal server error" },
        },
        message: "Request failed with status code 500",
      });

      // Act
      const result = await geminiService.queryWithCache(
        question,
        "langchain",
        "gemini-2.5-flash"
      );

      // Assert
      expect(result.fallback).toBe(true);
      expect(result.system).toBe("fallback_direct");
    });

    test("should fallback when FastAPI times out", async () => {
      // Arrange
      mockAxiosInstance.post.mockRejectedValue(
        new Error("timeout of 30000ms exceeded")
      );

      // Act
      const result = await geminiService.queryWithCache(
        "Timeout test",
        "auto",
        "gemini-1.5-flash"
      );

      // Assert
      expect(result.fallback).toBe(true);
      expect(result.system).toBe("fallback_direct");
      expect(result.accuracy).toBe(75.0);
    });

    test("should use correct Gemini model in fallback", async () => {
      // Arrange
      const model = "gemini-2.0-flash";
      let capturedModelConfig;

      mockAxiosInstance.post.mockRejectedValue(new Error("Service down"));

      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: (config) => {
          capturedModelConfig = config;
          return {
            generateContent: jest.fn().mockResolvedValue({
              response: { text: () => "Test answer" },
            }),
          };
        },
      }));

      // Act
      await geminiService.queryWithCache("Test", "native", model);

      // Assert
      expect(capturedModelConfig).toEqual({ model });
    });

    test("should throw error when both FastAPI and Gemini API fail", async () => {
      // Arrange
      mockAxiosInstance.post.mockRejectedValue(new Error("FastAPI down"));

      GoogleGenerativeAI.mockImplementation(() => {
        throw new Error("Gemini API authentication failed");
      });

      // Act & Assert
      await expect(
        geminiService.queryWithCache(
          "Test double failure",
          "native",
          "gemini-1.5-flash"
        )
      ).rejects.toThrow("Both FastAPI and fallback Gemini API failed");
    });

    test("fallback should not be cached", async () => {
      // Arrange
      const question = "Fallback cache test";
      mockAxiosInstance.post.mockRejectedValue(new Error("Service unavailable"));

      // Act
      const result = await geminiService.queryWithCache(
        question,
        "native",
        "gemini-1.5-flash"
      );

      // Assert
      expect(result.fallback).toBe(true);
      expect(result.cached).toBe(false);
    });
  });

  describe("Integration Test: Cache statistics calculation", () => {
    test("should track cache statistics across multiple queries", async () => {
      // Arrange - Get initial stats
      const initialStats = geminiService.getCacheStats();

      const mockResponse = (answer) => ({
        data: {
          answer,
          system: "native",
          accuracy: 96.8,
          response_time: 800,
          sources: [],
          gemini_model: "gemini-1.5-flash",
        },
      });

      mockAxiosInstance.post
        .mockResolvedValueOnce(mockResponse("Answer 1"))
        .mockResolvedValueOnce(mockResponse("Answer 2"))
        .mockResolvedValueOnce(mockResponse("Answer 3"));

      // Act - Execute queries (miss, hit, miss, hit, hit)
      await geminiService.queryWithCache("Q1", "native"); // Miss
      await geminiService.queryWithCache("Q1", "native"); // Hit
      await geminiService.queryWithCache("Q2", "native"); // Miss
      await geminiService.queryWithCache("Q1", "native"); // Hit
      await geminiService.queryWithCache("Q2", "native"); // Hit

      const stats = geminiService.getCacheStats();

      // Assert
      expect(stats.misses).toBe(initialStats.misses + 2); // Q1 and Q2 first calls
      expect(stats.hits).toBe(initialStats.hits + 3); // Q1 twice, Q2 once
      expect(stats.total_requests).toBe(initialStats.total_requests + 5);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2); // Only Q1 and Q2 initial calls
    });

    test("should calculate hit rate correctly", async () => {
      // Arrange - Fresh service instance for clean stats
      jest.resetModules();
      const freshMockInstance = {
        post: jest.fn(),
        defaults: { baseURL: "http://localhost:5001" },
        interceptors: { response: { use: jest.fn() } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => freshMockInstance),
      }));

      const freshService = require("../services/geminiServices");

      const mockResponse = {
        data: {
          answer: "Test answer",
          system: "native",
          accuracy: 96.8,
          response_time: 800,
          sources: [],
          gemini_model: "gemini-1.5-flash",
        },
      };

      freshMockInstance.post.mockResolvedValue(mockResponse);

      // Act - 1 miss, 2 hits = 66.67% hit rate
      await freshService.queryWithCache("Question", "native");
      await freshService.queryWithCache("Question", "native");
      await freshService.queryWithCache("Question", "native");

      const stats = freshService.getCacheStats();

      // Assert
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.total_requests).toBe(3);
      expect(stats.hit_rate).toBe("66.67%");

      // Restore
      geminiService = require("../services/geminiServices");
    });

    test("should track cache size correctly", async () => {
      // Arrange
      const mockResponse = (n) => ({
        data: {
          answer: `Answer ${n}`,
          system: "native",
          accuracy: 96.8,
          response_time: 800,
          sources: [],
          gemini_model: "gemini-1.5-flash",
        },
      });

      mockAxiosInstance.post
        .mockResolvedValueOnce(mockResponse(1))
        .mockResolvedValueOnce(mockResponse(2))
        .mockResolvedValueOnce(mockResponse(3));

      const initialSize = geminiService.getCacheStats().size;

      // Act - Add 3 unique queries
      await geminiService.queryWithCache("Unique Q1", "native");
      await geminiService.queryWithCache("Unique Q2", "native");
      await geminiService.queryWithCache("Unique Q3", "native");

      const stats = geminiService.getCacheStats();

      // Assert
      expect(stats.size).toBe(initialSize + 3);
    });

    test("should differentiate cache keys by RAG type and model", async () => {
      // Arrange - Get fresh service instance to avoid cache pollution
      jest.resetModules();
      jest.clearAllMocks();

      const freshMockInstance = {
        post: jest.fn(),
        defaults: { baseURL: "http://localhost:5001" },
        interceptors: { response: { use: jest.fn() } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => freshMockInstance),
      }));

      const freshService = require("../services/geminiServices");

      const question = "Same question";

      const mockResponse = (system) => ({
        data: {
          answer: `${system} answer`,
          system,
          accuracy: 90.0,
          response_time: 800,
          sources: [],
          gemini_model: "gemini-1.5-flash",
        },
      });

      freshMockInstance.post
        .mockResolvedValueOnce(mockResponse("native"))
        .mockResolvedValueOnce(mockResponse("langchain"))
        .mockResolvedValueOnce(mockResponse("native"));

      // Act - Same question, different RAG types
      await freshService.queryWithCache(question, "native", "gemini-1.5-flash");
      await freshService.queryWithCache(question, "langchain", "gemini-1.5-flash");
      await freshService.queryWithCache(question, "native", "gemini-2.5-flash");

      // Assert - All should be cache misses (different cache keys)
      expect(freshMockInstance.post).toHaveBeenCalledTimes(3);

      // Restore
      geminiService = require("../services/geminiServices");
    });
  });

  describe("Integration Test: Complete workflow", () => {
    test("should handle complete flow: query, cache, fallback, stats", async () => {
      // Arrange - Use fresh instance to avoid cache pollution
      jest.resetModules();
      jest.clearAllMocks();

      const freshMockInstance = {
        post: jest.fn(),
        defaults: { baseURL: "http://localhost:5001" },
        interceptors: { response: { use: jest.fn() } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => freshMockInstance),
      }));

      const { GoogleGenerativeAI: FreshGoogleAI } = require("@google/generative-ai");
      const freshService = require("../services/geminiServices");

      const mockFastAPIResponse = {
        data: {
          answer: "FastAPI answer",
          system: "native",
          accuracy: 96.8,
          response_time: 850,
          sources: [
            {
              pasal_ayat: "Pasal 28",
              preview: "Test preview",
              relevance_score: 0.9,
            },
          ],
          gemini_model: "gemini-1.5-flash",
          fallback: false,
        },
      };

      freshMockInstance.post
        .mockResolvedValueOnce(mockFastAPIResponse)
        .mockRejectedValueOnce(new Error("Service down"));

      FreshGoogleAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => "Fallback answer" },
          }),
        }),
      }));

      const initialStats = freshService.getCacheStats();

      // Act 1: Successful FastAPI query
      const result1 = await freshService.queryWithCache(
        "Question 1",
        "native",
        "gemini-1.5-flash"
      );

      // Assert 1
      expect(result1.cached).toBe(false);
      expect(result1.fallback).toBe(false);
      expect(result1.answer).toBe("FastAPI answer");
      expect(result1.sources).toHaveLength(1);

      // Act 2: Cache hit for same question
      const result2 = await freshService.queryWithCache(
        "Question 1",
        "native",
        "gemini-1.5-flash"
      );

      // Assert 2
      expect(result2.cached).toBe(true);
      expect(result2.answer).toBe(result1.answer);
      expect(freshMockInstance.post).toHaveBeenCalledTimes(1); // Still only 1 call

      // Act 3: Fallback when FastAPI fails
      const result3 = await freshService.queryWithCache(
        "Question 2",
        "langchain",
        "gemini-2.5-flash"
      );

      // Assert 3
      expect(result3.fallback).toBe(true);
      expect(result3.cached).toBe(false);
      expect(result3.system).toBe("fallback_direct");
      expect(result3.answer).toBe("Fallback answer");

      // Act 4: Check cache statistics
      const stats = freshService.getCacheStats();

      // Assert 4
      expect(stats.misses).toBe(initialStats.misses + 2); // Q1 and Q2
      expect(stats.hits).toBe(initialStats.hits + 1); // Q1 second call
      expect(stats.total_requests).toBe(initialStats.total_requests + 3);
      expect(freshMockInstance.post).toHaveBeenCalledTimes(2); // Q1 and Q2

      // Restore
      geminiService = require("../services/geminiServices");
    });

    test("should handle mixed success and failure scenarios", async () => {
      // Arrange - Use fresh instance
      jest.resetModules();
      jest.clearAllMocks();

      const freshMockInstance = {
        post: jest.fn(),
        defaults: { baseURL: "http://localhost:5001" },
        interceptors: { response: { use: jest.fn() } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => freshMockInstance),
      }));

      const { GoogleGenerativeAI: FreshGoogleAI } = require("@google/generative-ai");
      const freshService = require("../services/geminiServices");

      freshMockInstance.post
        .mockResolvedValueOnce({
          data: {
            answer: "Success 1",
            system: "native",
            accuracy: 96.8,
            response_time: 800,
            sources: [],
            gemini_model: "gemini-1.5-flash",
            fallback: false,
          },
        })
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce({
          data: {
            answer: "Success 2",
            system: "langchain",
            accuracy: 89.2,
            response_time: 900,
            sources: [],
            gemini_model: "gemini-2.5-flash",
            fallback: false,
          },
        });

      FreshGoogleAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => "Fallback response" },
          }),
        }),
      }));

      // Act
      const r1 = await freshService.queryWithCache("Q1", "native");
      const r2 = await freshService.queryWithCache("Q2", "langchain");
      const r3 = await freshService.queryWithCache("Q3", "auto");

      // Assert
      expect(r1.fallback).toBe(false);
      expect(r1.answer).toBe("Success 1");

      expect(r2.fallback).toBe(true);
      expect(r2.answer).toBe("Fallback response");

      expect(r3.fallback).toBe(false);
      expect(r3.answer).toBe("Success 2");

      // Restore
      geminiService = require("../services/geminiServices");
    });

    test("should maintain cache integrity across FastAPI failures", async () => {
      // Arrange - Use fresh instance to avoid cache pollution
      jest.resetModules();
      jest.clearAllMocks();

      const freshMockInstance = {
        post: jest.fn(),
        defaults: { baseURL: "http://localhost:5001" },
        interceptors: { response: { use: jest.fn() } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => freshMockInstance),
      }));

      const { GoogleGenerativeAI: FreshGoogleAI } = require("@google/generative-ai");
      const freshService = require("../services/geminiServices");

      const question = "Cached question";

      freshMockInstance.post
        .mockResolvedValueOnce({
          data: {
            answer: "Original answer",
            system: "native",
            accuracy: 96.8,
            response_time: 800,
            sources: [],
            gemini_model: "gemini-1.5-flash",
          },
        })
        .mockRejectedValue(new Error("Service down"));

      FreshGoogleAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => "Should not be used" },
          }),
        }),
      }));

      // Act
      const result1 = await freshService.queryWithCache(
        question,
        "native",
        "gemini-1.5-flash"
      );
      const result2 = await freshService.queryWithCache(
        question,
        "native",
        "gemini-1.5-flash"
      );

      // Try different question that will fail
      const result3 = await freshService.queryWithCache(
        "Different question",
        "native",
        "gemini-1.5-flash"
      );

      // Original question should still be cached
      const result4 = await freshService.queryWithCache(
        question,
        "native",
        "gemini-1.5-flash"
      );

      // Assert
      expect(result1.cached).toBe(false);
      expect(result1.answer).toBe("Original answer");

      expect(result2.cached).toBe(true);
      expect(result2.answer).toBe("Original answer");

      expect(result3.fallback).toBe(true);

      expect(result4.cached).toBe(true);
      expect(result4.answer).toBe("Original answer");
      // Note: fallback flag is not preserved in cache metadata

      // Restore
      geminiService = require("../services/geminiServices");
    });
  });

  describe("Integration Test: Response metadata preservation", () => {
    test("should preserve all response metadata through cache", async () => {
      // Arrange - Use fresh instance
      jest.resetModules();
      jest.clearAllMocks();

      const freshMockInstance = {
        post: jest.fn(),
        defaults: { baseURL: "http://localhost:5001" },
        interceptors: { response: { use: jest.fn() } },
      };

      jest.doMock("axios", () => ({
        create: jest.fn(() => freshMockInstance),
      }));

      const freshService = require("../services/geminiServices");

      const mockResponse = {
        data: {
          answer: "Detailed answer",
          system: "native",
          accuracy: 96.8,
          response_time: 850,
          sources: [
            {
              pasal_ayat: "Pasal 1 Ayat 1",
              preview: "Preview text",
              relevance_score: 0.95,
              chunk_id: 12,
            },
          ],
          gemini_model: "gemini-2.5-flash",
          cached: false,
          fallback: false,
        },
      };

      freshMockInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result1 = await freshService.queryWithCache(
        "Test",
        "native",
        "gemini-2.5-flash"
      );
      const result2 = await freshService.queryWithCache(
        "Test",
        "native",
        "gemini-2.5-flash"
      );

      // Assert - First result (from FastAPI)
      expect(result1).toMatchObject({
        answer: "Detailed answer",
        system: "native",
        accuracy: 96.8,
        gemini_model: "gemini-2.5-flash",
        cached: false,
      });
      expect(result1.sources).toHaveLength(1);
      expect(result1.sources[0]).toMatchObject({
        pasal_ayat: "Pasal 1 Ayat 1",
        relevance_score: 0.95,
      });

      // Assert - Second result (from cache)
      expect(result2.cached).toBe(true);
      expect(result2.answer).toBe(result1.answer);
      expect(result2.system).toBe(result1.system);
      expect(result2.accuracy).toBe(result1.accuracy);
      expect(result2.sources).toEqual(result1.sources);

      // Restore
      geminiService = require("../services/geminiServices");
    });
  });
});
