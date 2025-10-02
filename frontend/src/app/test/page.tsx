"use client";

import { useState } from "react";
import { apiService } from "@/services/api";

export default function TestPage() {
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    setTestResult("🔍 Testing backend connection...\n");

    try {
      // Test health check
      const healthResponse = await fetch("http://localhost:5000/api/health");
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setTestResult((prev) => prev + "✅ Backend health check passed\n");
        setTestResult(
          (prev) =>
            prev + `📊 Health data: ${JSON.stringify(healthData, null, 2)}\n\n`
        );
      } else {
        setTestResult((prev) => prev + "❌ Backend health check failed\n");
      }

      // Test chat API
      setTestResult((prev) => prev + "🔍 Testing chat API...\n");
      const response = await apiService.askQuestion(
        "apa itu pasal 1 ayat 1?",
        "",
        "auto"
      );

      if (response.success) {
        setTestResult((prev) => prev + "✅ Chat API test passed\n");
        setTestResult(
          (prev) =>
            prev +
            `📝 Answer preview: ${response.data.answer.substring(0, 100)}...\n`
        );
        setTestResult((prev) => prev + `🤖 System: ${response.data.system}\n`);
        setTestResult(
          (prev) => prev + `📊 Accuracy: ${response.data.accuracy}%\n`
        );
        setTestResult(
          (prev) => prev + `⏱️ Response time: ${response.data.responseTime}ms\n`
        );
      } else {
        setTestResult((prev) => prev + "❌ Chat API test failed\n");
      }
    } catch (error) {
      setTestResult(
        (prev) =>
          prev +
          `❌ Error: ${
            error instanceof Error ? error.message : String(error)
          }\n`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Backend Connection Test</h1>

        <div className="mb-8">
          <button
            onClick={testBackendConnection}
            disabled={loading}
            className="bg-[#F60] hover:bg-[#e55500] disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "⏳ Testing..." : "🚀 Test Backend Connection"}
          </button>
        </div>

        {testResult && (
          <div className="bg-[#2A2A2A] rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Test Results:</h2>
            <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
              {testResult}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">📡 Connection Status:</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Backend: http://localhost:5000</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Frontend: http://localhost:3000</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <a
            href="/chat"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            🗨️ Go to Chat Application
          </a>
        </div>
      </div>
    </div>
  );
}
