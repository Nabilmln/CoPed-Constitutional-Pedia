# CoPed Web

Aplikasi full-stack Next.js untuk CoPed. Petunjuk setup, endpoint, dan quality
gate tersedia pada [README utama](../README.md) dan folder [docs](../docs).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Karena workspace ini berada di OneDrive, `npm run dev` membersihkan cache
generated `.next` sebelum startup. Hal ini mencegah folder Files On-Demand
dibaca Next.js sebagai reparse point/symlink yang tidak valid.

Alias berikut tetap tersedia:

```bash
npm run dev:fresh
```

Untuk clone yang berada di luar OneDrive dan ingin mempertahankan cache:

```bash
npm run dev:cached
```
