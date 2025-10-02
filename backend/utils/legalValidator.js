/**
 * Legal Context Validator
 * Memvalidasi apakah pertanyaan berada dalam konteks hukum konstitusi Indonesia
 */

class LegalContextValidator {
  constructor() {
    // Kata kunci legal yang diizinkan
    this.legalKeywords = [
      "uud",
      "undang-undang dasar",
      "konstitusi",
      "pasal",
      "ayat",
      "bab",
      "presiden",
      "wakil presiden",
      "mpr",
      "dpr",
      "dpd",
      "mahkamah konstitusi",
      "mahkamah agung",
      "kedaulatan",
      "negara kesatuan",
      "republik",
      "demokrasi",
      "hak asasi manusia",
      "hak asasi",
      "kewajiban asasi",
      "pancasila",
      "bhinneka tunggal ika",
      "nkri",
      "amandemen",
      "perubahan uud",
      "impeachment",
    ];

    // Kata kunci non-legal yang harus ditolak
    this.nonLegalKeywords = [
      "komputer",
      "software",
      "hardware",
      "programming",
      "coding",
      "film",
      "musik",
      "game",
      "hiburan",
      "artis",
      "sepak bola",
      "basketball",
      "badminton",
      "bulu tangkis",
      "tenis",
      "voli",
      "olahraga",
      "sport",
      "makanan",
      "masakan",
      "resep",
      "kuliner",
      "restoran",
      "bisnis",
      "pemasaran",
      "marketing",
      "investasi",
      "saham",
    ];
  }

  /**
   * Validasi apakah pertanyaan dalam konteks legal
   */
  isLegalContext(question) {
    const questionLower = question.toLowerCase();

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

    // Default to invalid if no clear legal context
    return {
      isValid: false,
      reason: "insufficient_legal_context",
      message: "Pertanyaan tidak memiliki konteks hukum konstitusi yang cukup",
    };
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
      system: "Not In Context",
      accuracy: 0,
      responseTime: 50,
      sources: [],
      geminiModel: "context_validator",
      isError: false,
      errorMessage: validationResult.message,
      validationReason: validationResult.reason,
    };
  }
}

module.exports = new LegalContextValidator();
