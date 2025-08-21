"use client";

import { useState } from "react";
import Image from "next/image";

export default function SectionTwo() {
  const handleAyoCoba = () => {
    console.log("Ayo Coba clicked");
    // TODO: Navigate to AI model page
  };

  const handleTryNow = () => {
    console.log("Try Now clicked");
    // TODO: Navigate to chat page
  };

  return (
    <section id="section-2" className="section-two">
      <div className="section-two-container">
        {/* Title */}
        <h2 className="section-two-title">
          Efisiensi dan Pelayanan yang tersedia
        </h2>

        {/* Description */}
        <p className="section-two-description">
          Memiliki dua model yang menggunakan metode berbeda dalam menjawab
          pertanyaan mu
        </p>

        {/* Buttons */}
        <div className="section-two-buttons">
          <button className="ayo-coba-button" onClick={handleAyoCoba}>
            Ayo Coba!
          </button>
          <button className="try-now-secondary-button" onClick={handleTryNow}>
            Try now
          </button>
        </div>

        {/* Five Cards Container */}
        <div className="cards-container">
          {/* Card 1 - Robot Image */}
          <div className="card card-1">
            <Image
              src="/robo-picture.jpeg"
              alt="AI Robot"
              fill
              className="card-image"
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* Card 2 - AI Text */}
          <div className="card card-2">
            <p className="card-2-text">
              Artificial Intelligence untuk Pemahaman Dokumen UUD 1945
            </p>
          </div>

          {/* Card 3 - Document Icon */}
          <div className="card card-3">
            <div className="card-3-content">
              <Image
                src="/doc-icon.png"
                alt="Document Icon"
                width={48}
                height={48}
                className="card-icon"
              />
              <p className="card-3-text">
                Penggunaan Konsep Retrieval-Augmented Generation
              </p>
            </div>
          </div>

          {/* Card 4 - Statistics */}
          <div className="card card-4">
            <div className="card-4-content">
              <div className="percentage">85%</div>
              <p className="card-4-text">
                Respon yang sesuai dengan UUD 1945 terbaru dan referensi yang
                disediakan
              </p>
            </div>
          </div>

          {/* Card 5 - Timer Icon */}
          <div className="card card-5">
            <div className="card-5-content">
              <Image
                src="/timer-icon.png"
                alt="Timer Icon"
                width={48}
                height={48}
                className="card-icon"
              />
              <p className="card-5-text">
                Respon yang cepat dan sesuai pertanyaan
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
