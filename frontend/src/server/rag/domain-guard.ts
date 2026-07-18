const INJECTION_PATTERNS = [
  /abaikan\s+(semua\s+)?instruksi/i,
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /(?:tampilkan|bocorkan|ungkapkan)\s+(?:system\s+)?prompt/i,
  /jangan\s+gunakan\s+(?:dokumen|uud|konteks)/i,
  /jawab\s+tanpa\s+(?:dokumen|konteks|uud)/i,
  /developer\s+message/i,
  /system\s+message/i,
];

const DOMAIN_PATTERNS = [
  /\buud(?:\s+1945)?\b/i,
  /\bundang[-\s]?undang dasar\b/i,
  /\bpasal\b/i,
  /\bayat\b/i,
  /\bkonstitusi\b/i,
  /\bkedaulatan\b/i,
  /\bwarga negara\b/i,
  /\bhak asasi\b/i,
  /\bkebebasan beragama\b/i,
  /\bpresiden\b/i,
  /\bmasa jabatan\b/i,
  /\bpendidikan\b/i,
  /\bpemerintahan\b/i,
  /\bnegara indonesia\b/i,
  /\bmajelis permusyawaratan rakyat\b/i,
  /\bdewan perwakilan rakyat\b/i,
  /\bmahkamah konstitusi\b/i,
];

export type DomainGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "prompt_injection" | "out_of_domain";
    };

export const evaluateQuestionDomain = (
  question: string,
): DomainGuardResult => {
  const normalized = question.trim();

  if (INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { allowed: false, reason: "prompt_injection" };
  }

  if (!DOMAIN_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { allowed: false, reason: "out_of_domain" };
  }

  return { allowed: true };
};
