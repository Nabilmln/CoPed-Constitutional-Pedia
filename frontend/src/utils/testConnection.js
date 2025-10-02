// Test script untuk memastikan koneksi frontend-backend
const testConnection = async () => {
  try {
    console.log("🔍 Testing backend connection...");

    // Test health endpoint
    const healthResponse = await fetch("http://localhost:5000/api/health");
    if (healthResponse.ok) {
      console.log("✅ Backend health check passed");
    } else {
      console.log("❌ Backend health check failed");
    }

    // Test chat endpoint
    const chatResponse = await fetch("http://localhost:5000/api/chat/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "test connection",
        ragSystem: "auto",
      }),
    });

    if (chatResponse.ok) {
      const data = await chatResponse.json();
      console.log("✅ Chat endpoint test passed");
      console.log("📊 Response:", data);
    } else {
      console.log("❌ Chat endpoint test failed");
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error);
  }
};

// Run test if this file is executed directly
if (typeof window === "undefined") {
  testConnection();
}

export default testConnection;
