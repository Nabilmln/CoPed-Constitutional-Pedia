# Threads Background Component

Komponen UI untuk membuat background animasi dengan efek threads menggunakan WebGL.

## Installation

Komponen ini sudah tersedia di `src/components/ui/threads.tsx` dan menggunakan library `ogl` yang sudah terinstall.

## Usage

### Import

```tsx
import Threads from "@/components/ui/threads";
```

### Basic Usage

```tsx
<div style={{ width: "100%", height: "600px", position: "relative" }}>
  <Threads amplitude={1} distance={0} enableMouseInteraction={true} />
</div>
```

### Props

| Prop                     | Type                       | Default     | Description                   |
| ------------------------ | -------------------------- | ----------- | ----------------------------- |
| `color`                  | `[number, number, number]` | `[1, 1, 1]` | Warna RGB (0-1) untuk threads |
| `amplitude`              | `number`                   | `1`         | Amplitudo animasi gelombang   |
| `distance`               | `number`                   | `0`         | Jarak antar thread lines      |
| `enableMouseInteraction` | `boolean`                  | `false`     | Aktifkan interaksi mouse      |

### Examples

#### 1. Background Fullscreen

```tsx
export default function MyPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Threads
          color={[0.2, 0.6, 1.0]} // Biru
          amplitude={1.5}
          distance={0.2}
          enableMouseInteraction={true}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8">
        <h1 className="text-white">My Content</h1>
      </div>
    </div>
  );
}
```

#### 2. Section Background

```tsx
export default function MyComponent() {
  return (
    <section className="relative h-96 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Threads
          color={[1, 0.5, 0]} // Orange
          amplitude={0.8}
          distance={0.1}
          enableMouseInteraction={false}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <h2 className="text-white text-3xl">Section Title</h2>
      </div>
    </section>
  );
}
```

#### 3. Card Background

```tsx
export default function MyCard() {
  return (
    <div className="relative w-80 h-60 rounded-xl overflow-hidden">
      {/* Background */}
      <Threads
        color={[0.8, 0.2, 0.8]} // Purple
        amplitude={0.5}
        distance={0}
        enableMouseInteraction={true}
      />

      {/* Content */}
      <div className="relative z-10 p-6 bg-black/20">
        <h3 className="text-white text-xl">Card Title</h3>
        <p className="text-gray-200">Card description</p>
      </div>
    </div>
  );
}
```

## Color Examples

```tsx
// Putih (default)
<Threads color={[1, 1, 1]} />

// Biru
<Threads color={[0.2, 0.6, 1.0]} />

// Merah
<Threads color={[1, 0.2, 0.2]} />

// Hijau
<Threads color={[0.2, 1, 0.4]} />

// Orange
<Threads color={[1, 0.5, 0]} />

// Purple
<Threads color={[0.8, 0.2, 0.8]} />
```

## Performance Tips

1. **Posisi Fixed/Absolute**: Gunakan `position: fixed` atau `position: absolute` untuk background fullscreen
2. **Z-Index**: Pastikan background memiliki `z-index` yang lebih rendah dari konten
3. **Overflow Hidden**: Gunakan `overflow: hidden` pada container untuk menghindari scrollbar
4. **Mouse Interaction**: Hanya aktifkan `enableMouseInteraction` jika diperlukan untuk menghemat performa

## Demo

Lihat demo lengkap di: `http://localhost:3000/threads-demo`
