# CoPed Web

Aplikasi full-stack Next.js untuk CoPed. Petunjuk setup, endpoint, dan quality
gate tersedia pada [README utama](../README.md) dan folder [docs](../docs).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Jika development server menampilkan asset lama setelah perubahan besar:

```bash
npm run dev:fresh
```

Command tersebut menghapus hanya cache generated `.next` lalu menjalankan
server kembali. Untuk penggunaan normal, tetap gunakan `npm run dev`.
