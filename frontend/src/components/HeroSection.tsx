"use client";

import { Suspense, useState, useEffect } from "react";
import { LoaderOne } from "@/components/ui/loader";

// Enhanced Spline placeholder with LoaderOne
const SplinePlaceholder = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="spline-container flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-200/30">
        <div className="text-center p-8">
          <div className="mb-6">
            <LoaderOne />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Initializing 3D Environment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="spline-container flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 rounded-xl">
      <div className="text-center text-white p-8">
        <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
          <div className="text-4xl">🏛️</div>
        </div>
        <p className="text-sm opacity-80">3D Visualization</p>
        <p className="text-xs opacity-60">Constitutional Explorer</p>
      </div>
    </div>
  );
};

export default function HeroSection() {
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
        <Suspense
          fallback={
            <div className="spline-container flex flex-col items-center justify-center">
              <div className="mb-4">
                <LoaderOne />
              </div>
              <p className="loading-text text-sm text-neutral-600 dark:text-neutral-400">
                Loading 3D Scene...
              </p>
            </div>
          }
        >
          <SplinePlaceholder />
        </Suspense>
      </div>
    </main>
  );
}
