import Header from "../../components/Header";
import HeroSection from "../../components/HeroSection";
import SectionTwo from "../../components/SectionTwo";

// Server Component - dapat async jika perlu fetch data
export default function HomePage() {
  return (
    <div className="home-page">
      <Header />
      <HeroSection />
      <SectionTwo />
    </div>
  );
}
