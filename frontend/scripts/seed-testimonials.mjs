import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed testimonials.");
}

const sql = neon(databaseUrl);

const demoTestimonials = [
  {
    name: "Alya (Demo)",
    message:
      "Tampilan CoPed membuat topik konstitusi terasa lebih dekat dan tidak menakutkan untuk dipelajari.",
  },
  {
    name: "Bagas (Demo)",
    message:
      "Rujukan pasal pada setiap jawaban membantu saya mengecek kembali informasi dengan cepat.",
  },
  {
    name: "Citra (Demo)",
    message:
      "Saya suka karena chatbot tetap fokus pada UUD 1945 dan tidak memberi jawaban di luar dokumen.",
  },
  {
    name: "Dimas (Demo)",
    message:
      "Contoh pertanyaannya memudahkan saya memulai eksplorasi ketika belum tahu harus bertanya apa.",
  },
  {
    name: "Farah (Demo)",
    message:
      "Bahasa jawabannya ringkas, tetapi sumber pasalnya tetap tersedia saat ingin membaca lebih lanjut.",
  },
  {
    name: "Galih (Demo)",
    message:
      "CoPed cocok menjadi pendamping belajar untuk memahami hubungan antarpasal dalam konstitusi.",
  },
  {
    name: "Intan (Demo)",
    message:
      "Pengalaman bertanya terasa sederhana dan saya tidak perlu membuat akun atau ruang chat dahulu.",
  },
  {
    name: "Nanda (Demo)",
    message:
      "Statistik dan testimoni membuat aplikasi terasa hidup sekaligus tetap menjaga privasi pengguna.",
  },
  {
    name: "Sari (Demo)",
    message:
      "Desainnya nyaman dibaca dan fitur rujukan membantu membedakan jawaban AI dari teks sumber.",
  },
];

const [alfiTestimonial] = await sql`
  SELECT id, name, status
  FROM feedback
  WHERE lower(trim(coalesce(name, ''))) = 'alfi'
  ORDER BY created_at DESC
  LIMIT 1
`;

if (!alfiTestimonial) {
  throw new Error(
    "Testimonial from Alfi was not found. Submit it through the form first.",
  );
}

await sql`
  UPDATE feedback
  SET status = 'reviewed'
  WHERE id = ${alfiTestimonial.id}
`;

const [existingSummary] = await sql`
  SELECT count(*)::integer AS real_reviewed_count
  FROM feedback
  WHERE status = 'reviewed'
    AND coalesce(name, '') NOT LIKE '%(Demo)'
`;

const requiredDemoCount = Math.max(
  0,
  10 - existingSummary.real_reviewed_count,
);

for (const [index, testimonial] of demoTestimonials.entries()) {
  if (index >= requiredDemoCount) {
    await sql`
      UPDATE feedback
      SET status = 'archived'
      WHERE name = ${testimonial.name}
        AND message = ${testimonial.message}
    `;
    continue;
  }

  await sql`
    INSERT INTO feedback (name, message, status)
    SELECT
      ${testimonial.name},
      ${testimonial.message},
      'reviewed'::feedback_status
    WHERE NOT EXISTS (
      SELECT 1
      FROM feedback
      WHERE name = ${testimonial.name}
        AND message = ${testimonial.message}
    )
  `;

  await sql`
    UPDATE feedback
    SET status = 'reviewed'
    WHERE name = ${testimonial.name}
      AND message = ${testimonial.message}
  `;
}

const [summary] = await sql`
  SELECT
    count(*)::integer AS reviewed_count,
    count(*) FILTER (
      WHERE lower(trim(coalesce(name, ''))) = 'alfi'
    )::integer AS alfi_count,
    count(*) FILTER (
      WHERE name LIKE '%(Demo)'
    )::integer AS demo_count
  FROM feedback
  WHERE status = 'reviewed'
`;

console.log("Testimonial seed completed.", {
  reviewed: summary.reviewed_count,
  alfi: summary.alfi_count,
  demo: summary.demo_count,
});
