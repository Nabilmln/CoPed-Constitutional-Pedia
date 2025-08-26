"use client";

import Spline from "@splinetool/react-spline";
import { useRouter } from "next/navigation";

// Client Component untuk Spline Visualization - Simple approach
function SplineVisualization() {
  return (
    <div
      style={{
        width: "470px",
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
  const router = useRouter();

  const handleTryNow = () => {
    // Navigate to chat page
    router.push("/chat");
  };

  return (
    <main
      id="section-1"
      className="flex items-center justify-between px-32 py-20 max-h-screen"
    >
      {/* Left Content */}
      <div className="flex-1 max-w-3xl">
        {/* Main Title */}
        <h1 className="hero-title mb-8">
          Co-Ped AI: Sahabat Pintar Memahami Konstitusi
        </h1>

        {/* Description */}
        <p className="hero-description mb-8">
          Co-Ped AI membantu kamu memahami isi dan makna Undang-Undang Dasar 1945 dengan cepat, akurat, dan mudah. Mulai dari pembukaan, pasal-pasal, hingga amandemen terbaru, semua bisa kamu tanyakan langsung.
        </p>

        {/* Search Box */}
        <div className="search-container">
          <div className="search-text">Tanyakan Apapun</div>
          <button className="lets-chat-button" onClick={handleTryNow}>
            UUD 1945
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
