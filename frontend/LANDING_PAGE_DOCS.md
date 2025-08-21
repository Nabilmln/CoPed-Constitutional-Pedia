# CoPed Landing Page Documentation

## Overview

Landing page yang telah dibuat untuk aplikasi CoPed (Constitutional Pedia) menggunakan Next.js 15 dengan TypeScript dan CSS custom sesuai dengan desain yang diminta.

## Struktur File

```
src/app/home/
├── page.tsx                    # Halaman utama home
├── components/
│   ├── Header.tsx             # Komponen header dengan logo, nav, dan button
│   └── HeroSection.tsx        # Komponen hero dengan title, description, search box, dan Spline animation
```

## Fitur Yang Telah Diimplementasi

### 1. Header Component

- **Logo**: Logo CoPed dengan dimensi 143x28px (aspect ratio 143/28)
- **Navigation**: Menu "Home" dan "Konsep" dengan font Michroma
- **Login Button**: Button "Masuk" dengan background #F60 dan border-radius 10px

### 2. Hero Section

- **Main Title**: "Temukan Jawaban dalam Co-Ped AI" dengan font Michroma 60px
- **Description**: Subtitle dengan font Poppins 20px
- **Search Container**:
  - Dimensi 480x72px dengan border-radius 60px
  - Background rgba(255, 255, 255, 0.07) dengan border #E0E0E0
  - Input field dengan placeholder
  - "Try now" button (185x54px) dengan background #F60
- **Spline Animation**: Animasi 3D dengan dimensi 420x438px (aspect ratio 70/73)

### 3. Styling & Design

- **Background**: #1A1A1A untuk seluruh aplikasi
- **Typography**:
  - Michroma untuk headings dan navigation
  - Poppins untuk body text dan buttons
- **Color Scheme**:
  - White (#FFF) untuk text
  - Orange (#F60) untuk buttons dan accents
  - Gray (#E0E0E0) untuk borders

### 4. Animations

- **Page Load**: Fade-in animation untuk seluruh halaman
- **Title**: Slide-in dari kiri dengan delay 0.2s
- **Description**: Slide-in dari kiri dengan delay 0.4s
- **Search Box**: Slide-in dari bawah dengan delay 0.6s
- **Hover Effects**:
  - Search container dengan glow effect
  - Button hover dengan color change

### 5. Responsive Design

- **Desktop**: Layout side-by-side (text kiri, animasi kanan)
- **Tablet (1200px)**: Layout column dengan animasi di bawah
- **Mobile (768px)**:
  - Header menjadi column layout
  - Search container menjadi column dengan button full-width
  - Font sizes disesuaikan

### 6. Interactive Features

- **Search Functionality**: Input field dengan state management
- **Keyboard Support**: Enter key untuk trigger search
- **Button Actions**: Click handler untuk "Try now" button

## Technology Stack

- **Next.js 15**: React framework dengan App Router
- **TypeScript**: Type safety
- **Google Fonts**: Michroma dan Poppins
- **Spline**: 3D animations
- **CSS Custom Properties**: Untuk theming dan font variables

## CSS Classes

- `.home-page`: Main container dengan background
- `.hero-title`: Main heading styling
- `.hero-description`: Subtitle styling
- `.search-container`: Search box container
- `.search-input`: Input field styling
- `.try-now-button`: CTA button styling
- `.login-button`: Header login button
- `.spline-container`: 3D animation container

## URL

Halaman dapat diakses di: `http://localhost:3000/home`

## Next Steps

1. Implementasi routing ke halaman chat
2. Integrasi dengan backend API
3. Tambah loading states
4. Implementasi dark/light mode toggle
5. SEO optimization
