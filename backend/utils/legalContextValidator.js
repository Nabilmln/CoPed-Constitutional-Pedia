/**
 * Legal Context Validator
 * Memvalidasi apakah pertanyaan berada dalam konteks hukum konstitusi Indonesia
 */

class LegalContextValidator {
  constructor() {
    // Kata kunci legal yang diizinkan
    this.legalKeywords = [
      // UUD 1945 Specific
      "uud",
      "undang-undang dasar",
      "konstitusi",
      "pasal",
      "ayat",
      "bab",
      "pembukaan uud",
      "batang tubuh",
      "penjelasan uud",

      // Government Structure
      "presiden",
      "wakil presiden",
      "menteri",
      "mpr",
      "dpr",
      "dpd",
      "mahkamah konstitusi",
      "mahkamah agung",
      "komisi yudisial",
      "bpk",
      "badan pemeriksa keuangan",

      // Constitutional Concepts
      "kedaulatan",
      "negara kesatuan",
      "republik",
      "demokrasi",
      "rule of law",
      "supremasi hukum",
      "trias politica",
      "checks and balances",
      "pemisahan kekuasaan",

      // Rights and Duties
      "hak asasi manusia",
      "hak asasi",
      "kewajiban asasi",
      "hak warga negara",
      "kewajiban warga negara",
      "hak politik",
      "hak sipil",
      "hak ekonomi",
      "hak sosial",
      "hak budaya",

      // Legal Processes
      "amandemen",
      "perubahan uud",
      "impeachment",
      "pemakzulan",
      "judicial review",
      "pengujian undang-undang",

      // Indonesian Specific Terms
      "pancasila",
      "bhinneka tunggal ika",
      "nkri",
      "negara kesatuan republik indonesia",
      "gotong royong",
      "musyawarah mufakat",
      "kekeluargaan",

      // Government Functions
      "legislatif",
      "eksekutif",
      "yudikatif",
      "pemerintahan",
      "pemerintah",
      "negara",
      "otonomi daerah",
      "desentralisasi",

      // Legal Documents
      "proklamasi",
      "piagam jakarta",
      "dekrit presiden",
      "tap mpr",
      "ketetapan mpr",
    ];

    // Kata kunci non-legal yang harus ditolak
    this.nonLegalKeywords = [
      // Technology
      "komputer",
      "software",
      "hardware",
      "programming",
      "coding",
      "internet",
      "website",
      "aplikasi",
      "digital",
      "teknologi",

      // Entertainment
      "film",
      "musik",
      "game",
      "hiburan",
      "artis",
      "selebriti",
      "entertainment",
      "movie",
      "song",

      // Sports
      "sepak bola",
      "basketball",
      "badminton",
      "bulu tangkis",
      "tenis",
      "voli",
      "olahraga",
      "sport",
      "pertandingan",
      "kompetisi",
      "turnamen",

      // Personal/Daily Life
      "makanan",
      "masakan",
      "resep",
      "kuliner",
      "restoran",
      "fashion",
      "pakaian",
      "style",
      "kecantikan",
      "kesehatan pribadi",

      // Science (non-legal)
      "fisika",
      "kimia",
      "biologi",
      "matematika",
      "astronomi",
      "geologi",
      "botani",
      "zoologi",

      // Business (non-legal)
      "bisnis",
      "pemasaran",
      "marketing",
      "sales",
      "profit",
      "investasi",
      "saham",
      "trading",
      "cryptocurrency",
    ];

    // Pola pertanyaan yang mencurigakan
    this.suspiciousPatterns = [
      /how to hack/i,
      /cara hack/i,
      /download.*gratis/i,
      /free download/i,
      /crack.*software/i,
      /generate.*code/i,
      /write.*program/i,
      /buat.*aplikasi/i,
      /create.*app/i,
    ];
  }

  /**
   * Validasi apakah pertanyaan dalam konteks legal
   */
  isLegalContext(question) {
    const questionLower = question.toLowerCase();

    // Check suspicious patterns first
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(question)) {
        return {
          isValid: false,
          reason: "suspicious_pattern",
          message: "Pertanyaan mengandung pola yang tidak diizinkan",
        };
      }
    }

    // Check for non-legal keywords
    const hasNonLegalContent = this.nonLegalKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase())
    );

    if (hasNonLegalContent) {
      return {
        isValid: false,
        reason: "non_legal_content",
        message: "Pertanyaan berada di luar konteks hukum konstitusi Indonesia",
      };
    }

    // Check for legal keywords
    const hasLegalContent = this.legalKeywords.some((keyword) =>
      questionLower.includes(keyword.toLowerCase())
    );

    if (hasLegalContent) {
      return {
        isValid: true,
        reason: "legal_keywords_found",
        message: "Pertanyaan dalam konteks hukum konstitusi",
      };
    }

    // Additional context analysis for edge cases
    const contextScore = this.calculateContextScore(questionLower);

    if (contextScore >= 0.3) {
      return {
        isValid: true,
        reason: "context_analysis",
        score: contextScore,
        message: "Pertanyaan kemungkinan berkaitan dengan hukum konstitusi",
      };
    }

    return {
      isValid: false,
      reason: "insufficient_legal_context",
      score: contextScore,
      message: "Pertanyaan tidak memiliki konteks hukum konstitusi yang cukup",
    };
  }

  /**
   * Hitung skor konteks legal
   */
  calculateContextScore(questionLower) {
    let score = 0;

    // Constitutional terms
    const constitutionalTerms = [
      "negara",
      "rakyat",
      "bangsa",
      "indonesia",
      "republik",
      "kesatuan",
    ];
    constitutionalTerms.forEach((term) => {
      if (questionLower.includes(term)) score += 0.1;
    });

    // Government terms
    const governmentTerms = [
      "pemerintah",
      "kekuasaan",
      "wewenang",
      "tanggung jawab",
    ];
    governmentTerms.forEach((term) => {
      if (questionLower.includes(term)) score += 0.15;
    });

    // Legal process terms
    const processTerms = ["aturan", "ketentuan", "prosedur", "mekanisme"];
    processTerms.forEach((term) => {
      if (questionLower.includes(term)) score += 0.1;
    });

    return score;
  }

  /**
   * Generate response untuk pertanyaan non-legal
   */
  generateRejectionResponse(validationResult) {
    const baseMessage =
      "🏛️ Maaf, saya merupakan AI Assistant Ahli Hukum Konstitusi Indonesia. Saya tidak dapat menjawab pertanyaan di luar konteks hukum yang Anda ajukan.";

    const expertise =
      "⚖️ **Keahlian saya meliputi:**\n• Undang-Undang Dasar 1945\n• Sistem ketatanegaraan Indonesia\n• Hak dan kewajiban konstitusional\n• Lembaga-lembaga negara\n• Proses amandemen UUD 1945";

    const suggestions = [
      '• "Apa isi pembukaan UUD 1945?"',
      '• "Bagaimana sistem checks and balances dalam UUD 1945?"',
      '• "Apa saja hak asasi manusia yang dijamin konstitusi?"',
      '• "Bagaimana mekanisme impeachment presiden menurut UUD 1945?"',
    ];

    return {
      answer: `${baseMessage}\n\n${expertise}\n\n💡 **Contoh pertanyaan yang dapat saya bantu jawab:**\n${suggestions.join(
        "\n"
      )}\n\n📚 Silakan ajukan pertanyaan seputar hukum konstitusi Indonesia!`,
      system: "legal_context_filter",
      accuracy: 0,
      responseTime: 50,
      sources: [],
      geminiModel: "context_validator",
      isError: false,
      errorMessage: validationResult.message,
      validationReason: validationResult.reason,
      contextScore: validationResult.score || 0,
    };
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      totalLegalKeywords: this.legalKeywords.length,
      totalNonLegalKeywords: this.nonLegalKeywords.length,
      totalSuspiciousPatterns: this.suspiciousPatterns.length,
    };
  }
}

module.exports = new LegalContextValidator();
