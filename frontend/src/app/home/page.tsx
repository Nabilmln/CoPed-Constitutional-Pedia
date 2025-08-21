import Header from "../../components/Header";
import HeroSection from "../../components/HeroSection";
import SectionTwo from "../../components/SectionTwo";
import Threads from "../../components/ui/threads";

// Server Component - dapat async jika perlu fetch data
export default function HomePage() {
  return (
    <div className="home-page relative min-h-screen">
      {/* Background Threads */}
      <div className="fixed inset-0 z-0">
        <Threads
          color={[1.0, 0.4, 0.0]} // Warna oranye
          amplitude={0.8}
          distance={0.1}
          enableMouseInteraction={true}
        />
      </div>

      {/* Content dengan z-index lebih tinggi */}
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <SectionTwo />
      </div>
    </div>
  );
}
