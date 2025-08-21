"use client";

import Threads from "@/components/ui/threads";

// Demo page untuk menunjukkan penggunaan komponen Threads
export default function ThreadsDemo() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="relative z-10 p-8">
        <h1 className="text-white text-4xl font-bold mb-4">
          Threads Background Demo
        </h1>
        <p className="text-gray-300 text-lg mb-8">
          Komponen background dengan animasi threads menggunakan WebGL
        </p>
      </div>

      {/* Background dengan Threads */}
      <div className="fixed inset-0 z-0">
        <Threads
          color={[0.2, 0.6, 1.0]} // Warna biru
          amplitude={1.5}
          distance={0.2}
          enableMouseInteraction={true}
        />
      </div>

      {/* Content Area */}
      <div className="relative z-10 p-8 space-y-8">
        {/* Card 1 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md">
          <h2 className="text-white text-xl font-semibold mb-3">
            Interactive Background
          </h2>
          <p className="text-gray-300">
            Gerakkan mouse Anda untuk melihat efek interaktif pada background.
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md ml-auto">
          <h2 className="text-white text-xl font-semibold mb-3">
            WebGL Powered
          </h2>
          <p className="text-gray-300">
            Background ini menggunakan WebGL untuk performa tinggi dan animasi
            yang smooth.
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md">
          <h2 className="text-white text-xl font-semibold mb-3">
            Customizable
          </h2>
          <p className="text-gray-300">
            Anda dapat mengubah warna, amplitudo, dan jarak threads sesuai
            kebutuhan.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-8 left-8 z-10">
        <a
          href="/home"
          className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
        >
          ← Kembali ke Home
        </a>
      </div>
    </div>
  );
}
