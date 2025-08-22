# Chat Page Documentation

Halaman Chat untuk aplikasi Co-Ped telah dibuat sesuai dengan requirement desain dan fungsionalitas.

## 📁 File Location

`src/app/chat/page.tsx`

## 🎨 Design Components

### 1. **Sidebar (Aside)**

- **Style**: `border-radius: 15px`, `background: #2A2A2A`
- **Logo**: Menampilkan logo Co-Ped dari `/public/coped-logo-white-full.png`
- **Tombol "Tambahkan Chat"**:
  - Background: `#F60` (orange Co-Ped)
  - Ikon pensil di kanan
  - Membuat room chat baru saat diklik

### 2. **History Chat**

- **Grouping**: Dikelompokkan berdasarkan tanggal (format: "22 Agustus")
- **Hover Effect**:
  - Background: `rgba(60, 60, 60, 0.56)`
  - Border-radius: `10px`
- **Dropdown Menu**: Ikon tiga titik dengan opsi:
  - Ganti nama roomchat
  - Hapus roomchat
- **Font**: Poppins warna putih

### 3. **Tombol Keluar**

- Background: `#F60`
- Untuk logout functionality

### 4. **Main Chat Area**

- **Dropdown Model**: Pilihan "Native" (default) dan "LangChain"
- **Input Pesan**:
  - Placeholder: "apa itu kewarganegaraan?"
  - Ikon search (MagnifyingGlass) untuk mengirim

### 5. **Chat Interface**

- **User Messages**: Sisi kanan, background `#F60`
- **AI Messages**:
  - Sisi kiri, background `#525252`
  - Logo Co-Ped di depan pesan
  - Border-radius: `10px`

## 🚀 Features

### ✅ **Implemented Features**

1. **Chat Room Management**

   - Buat chat baru
   - Ganti nama chat
   - Hapus chat
   - History berdasarkan tanggal

2. **Real-time Chat Interface**

   - Send message dengan Enter atau klik
   - Typing indicator dengan animasi
   - Auto-scroll ke pesan terbaru
   - Message animations

3. **Model Selection**

   - Dropdown untuk memilih AI model
   - Native vs LangChain options

4. **Responsive Design**

   - Desktop layout
   - Mobile-friendly (dalam CSS)

5. **Interactive Elements**
   - Hover effects
   - Dropdown menus
   - Button animations
   - Smooth transitions

### 🔄 **State Management**

```tsx
interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface ChatRoom {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ChatMessage[];
}
```

### 🎯 **Key Functions**

1. **handleSendMessage()**: Mengirim pesan dan simulate AI response
2. **handleNewChat()**: Membuat room chat baru
3. **handleRenameRoom()**: Mengubah nama room chat
4. **handleDeleteRoom()**: Menghapus room chat
5. **groupChatsByDate()**: Mengelompokkan chat berdasarkan tanggal

## 🎨 **Styling Classes**

### **Custom CSS Classes** (dalam `globals.css`):

```css
.chat-messages::-webkit-scrollbar /* Custom scrollbar */
.chat-history-item /* Hover effects */
.dropdown-menu /* Dropdown animations */
.message-enter /* Message animations */
.typing-indicator /* Typing indicator */
```

### **Tailwind Classes Used**:

- `bg-[#2A2A2A]` - Background sidebar
- `bg-[#525252]` - Background AI messages
- `bg-[#F60]` - Background buttons & user messages
- `rounded-2xl` - Border radius
- `poppins-regular/medium/semibold` - Font families

## 📱 **Usage**

### **Akses Halaman**:

```
http://localhost:3000/chat
```

### **Navigation Integration**:

```tsx
// Dari komponen lain
<Link href="/chat">
  <button>Go to Chat</button>
</Link>
```

## 🔧 **Dependencies**

- `@heroicons/react` - Icons
- `next/image` - Optimized images
- `React hooks` - useState, useRef, useEffect

## 🎯 **Future Enhancements**

1. **Real API Integration**

   - Connect ke backend AI service
   - Persistent chat storage
   - User authentication

2. **Advanced Features**

   - File upload/sharing
   - Voice messages
   - Message search
   - Export chat history

3. **UI Improvements**
   - Dark/light mode toggle
   - Custom themes
   - Message formatting (markdown)
   - Emoji support

## ✨ **Demo Data**

Halaman sudah dilengkapi dengan demo data untuk testing:

- 2 sample chat rooms
- Sample messages
- Grouped by date functionality

Halaman Chat Co-Ped sudah siap digunakan! 🎉
