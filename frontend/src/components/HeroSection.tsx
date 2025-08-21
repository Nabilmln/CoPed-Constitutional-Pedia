"use client";

import Spline from "@splinetool/react-spline";

// Client Component untuk Spline Visualization - Simple approach
function SplineVisualization() {
  return (
    <div
      style={{
        width: "570px",
        height: "438px",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      <Spline scene="https://prod.spline.design/af8BjZyLq84kzOGX/scene.splinecode" />
    </div>
  );
}

// Client Component untuk HeroSection - tidak async karena menggunakan 'use client'
function HeroSection() {
  const handleTryNow = () => {
    // TODO: Navigate to search/chat page
    console.log("Navigate to search page");
  };

  return (
    <main
      id="section-1"
      className="flex items-center justify-between px-32 py-20 max-h-screen"
    >
      {/* Left Content */}
      <div className="flex-1 max-w-3xl">
        {/* Main Title */}
        <h1 className="hero-title mb-8">Temukan Jawaban dalam Co-Ped AI</h1>

        {/* Description */}
        <p className="hero-description mb-8">
          Menjawab segala pertanyaan yang ingin kamu ketahui tentang UUD 1945
        </p>

        {/* Search Box */}
        <div className="search-container">
          <div className="search-text">Temukan Jawabanmu</div>
          <button className="try-now-button" onClick={handleTryNow}>
            Try now
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 ml-16">
        <SplineVisualization />
      </div>
    </main>
  );
}

export default HeroSection;
