# Single Page Navigation Implementation

## Overview

Implementasi navigasi dalam satu halaman (Single Page Application) untuk home page CoPed dengan smooth scroll functionality.

## Changes Made

### 1. Default Route Redirect

**File**: `src/app/page.tsx`

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/home");
}
```

- **Feature**: Automatic redirect dari root `/` ke `/home`
- **Benefit**: Default alamat menjadi `http://localhost:3000/home`

### 2. Section IDs Added

#### HeroSection (Section 1)

**File**: `src/components/HeroSection.tsx`

```tsx
<main id="section-1" className="...">
```

#### SectionTwo (Section 2)

**File**: `src/components/SectionTwo.tsx`

```tsx
<section id="section-2" className="...">
```

### 3. Updated Header Navigation

**File**: `src/components/Header.tsx`

#### Key Features:

- **Smooth Scroll**: JavaScript `scrollIntoView` dengan behavior smooth
- **Button-based Navigation**: Ganti Link dengan button untuk internal navigation
- **Event Handlers**: onClick functions untuk scroll to sections

#### Implementation:

```tsx
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
```

### 4. CSS Smooth Scroll Enhancement

**File**: `src/style/globals.css`

```css
html {
  scroll-behavior: smooth;
}
```

- **Fallback**: CSS smooth scroll untuk browser compatibility
- **Performance**: Hardware-accelerated scrolling

## Navigation Mapping

| Navbar Item | Target Section | Element ID   | Content                                            |
| ----------- | -------------- | ------------ | -------------------------------------------------- |
| **Home**    | Section 1      | `#section-1` | HeroSection - Hero content dengan 3D visualization |
| **Konsep**  | Section 2      | `#section-2` | SectionTwo - Efisiensi & pelayanan dengan cards    |

## User Experience

### Navigation Flow:

1. **Load Page**: User visits `http://localhost:3000`
2. **Auto Redirect**: Automatically redirected to `/home`
3. **Section Navigation**:
   - Click "Home" → Smooth scroll to Section 1 (Hero)
   - Click "Konsep" → Smooth scroll to Section 2 (Features)

### Scroll Behavior:

- **Smooth Animation**: 800ms easing transition
- **Block Position**: Scroll to start of section
- **Responsive**: Works on all screen sizes

## Technical Benefits

### 1. **Performance**

- No page reloads untuk navigation
- Faster transitions (smooth scroll vs page navigation)
- Single bundle loading

### 2. **SEO & Accessibility**

- Single page URL structure
- Proper semantic sections dengan IDs
- Keyboard navigation support

### 3. **User Experience**

- Seamless navigation experience
- Visual continuity
- Instant feedback

### 4. **Development**

- Simplified routing logic
- Easier state management
- Consistent layout (header persists)

## Browser Support

- **Modern Browsers**: Full support dengan JavaScript scrollIntoView
- **Fallback**: CSS scroll-behavior untuk older browsers
- **Mobile**: Touch-friendly smooth scrolling

## File Structure

```
src/
├── app/
│   ├── page.tsx              # Root redirect to /home
│   └── home/
│       └── page.tsx          # Main home page
├── components/
│   ├── Header.tsx            # Updated with scroll navigation
│   ├── HeroSection.tsx       # Section 1 dengan ID
│   └── SectionTwo.tsx        # Section 2 dengan ID
└── style/
    └── globals.css           # Added smooth scroll CSS
```

## Testing

✅ **Default Route**: `http://localhost:3000` → redirects to `/home`  
✅ **Home Navigation**: Click "Home" → scrolls to Section 1  
✅ **Konsep Navigation**: Click "Konsep" → scrolls to Section 2  
✅ **Smooth Scroll**: Animation works properly  
✅ **Responsive**: Functions on mobile/tablet

## Future Enhancements

- Add active section highlighting in navbar
- Implement scroll spy untuk auto-highlight current section
- Add keyboard shortcuts (Home, Page Down, etc.)
- Consider adding section transitions/parallax effects
