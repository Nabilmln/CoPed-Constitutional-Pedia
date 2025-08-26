"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

// Client Component untuk Header - tidak async karena menggunakan 'use client'
function Header() {
  const router = useRouter();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleHomeClick = () => {
    scrollToSection("section-1");
  };

  const handleKonsepClick = () => {
    scrollToSection("section-2");
  };

  const handleChatClick = () => {
    router.push("/chat");
  };

  return (
    <header className="flex items-center justify-between px-8 py-6 w-full">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Image
          src="/coped-logo-white-full.png"
          alt="CoPed Logo"
          width={123}
          height={20}
          className="aspect-[143/28]"
        />
      </div>

      {/* Navigation */}
      <nav className="flex items-center space-x-12">
        <button
          onClick={handleHomeClick}
          className="michroma-regular text-white text-4 hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-none"
        >
          Beranda
        </button>
        <button
          onClick={handleKonsepClick}
          className="michroma-regular text-white text-4 hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-none"
        >
          Tentang
        </button>
      </nav>

      {/* Chat Button */}
      <button onClick={handleChatClick} className="login-button">
        Tekan untuk bertanya!
      </button>
    </header>
  );
}

export default Header;
