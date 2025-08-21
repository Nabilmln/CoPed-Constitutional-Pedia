import Image from "next/image";
import Link from "next/link";

export default function Header() {
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
        <Link
          href="/"
          className="michroma-regular text-white text-4 hover:text-gray-300 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/konsep"
          className="michroma-regular text-white text-4 hover:text-gray-300 transition-colors"
        >
          Konsep
        </Link>
      </nav>

      {/* Login Button */}
      <button className="login-button">Masuk</button>
    </header>
  );
}
