"use client";

import Image from "next/image";

export default function Header() {
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
          Home
        </button>
        <button
          onClick={handleKonsepClick}
          className="michroma-regular text-white text-4 hover:text-gray-300 transition-colors cursor-pointer bg-transparent border-none"
        >
          Konsep
        </button>
      </nav>

      {/* Login Button */}
      <button className="login-button">Masuk</button>
    </header>
  );
}
