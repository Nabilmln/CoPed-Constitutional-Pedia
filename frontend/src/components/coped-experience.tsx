"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const SESSION_STORAGE_KEY = "copED_session_id";

type Source = {
  chunkId: string;
  articleNumber: string | null;
  paragraphNumber: string | null;
  chapter: string | null;
  excerpt: string;
  score: number;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  status?: "answered" | "rejected" | "no_context" | "error";
  sources?: Source[];
};

type Stats = {
  totalVisitors: number;
  totalQuestions: number;
  totalFeedback: number;
};

type ApiError = {
  success: false;
  message?: string;
};

type ChatSuccess = {
  success: true;
  data: {
    session_id: string;
    answer: string;
    status: Message["status"];
    sources: Source[];
  };
};

type VisitSuccess = {
  success: true;
  data: { session_id: string };
};

type StatsSuccess = {
  success: true;
  data: {
    total_visitors: number;
    total_questions: number;
    total_feedback: number;
  };
};

type FeedbackSuccess = {
  success: true;
  data: { session_id: string };
};

const SUGGESTED_QUESTIONS = [
  "Apa isi Pasal 1 ayat (1)?",
  "Bagaimana UUD 1945 mengatur hak pendidikan?",
  "Jelaskan fungsi Presiden menurut UUD 1945.",
];

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo! Saya CoPed. Tanyakan isi, pasal, atau makna yang tercantum dalam UUD 1945.",
};

const requestJson = async <T extends { success: true }>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(input, init);
  const payload = (await response.json()) as T | ApiError;

  if (!response.ok || payload.success === false) {
    throw new Error(
      "message" in payload && payload.message
        ? payload.message
        : "Permintaan belum dapat diproses.",
    );
  }

  return payload as T;
};

const createMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const formatCount = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value);

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const SendIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m4 4 17 8-17 8 3-8-3-8Z" />
    <path d="M7 12h14" />
  </svg>
);

const QuoteIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8.5 11H5a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2v1h3v5H5v-5M18.5 11H15a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2v1h3v5h-5v-5" />
  </svg>
);

export default function CopedExperience() {
  const [sessionId, setSessionId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [question, setQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [stats, setStats] = useState<Stats>();
  const [statsError, setStatsError] = useState(false);
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const saveSession = useCallback((nextSessionId: string) => {
    localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    setSessionId(nextSessionId);
    return nextSessionId;
  }, []);

  const ensureSession = useCallback(() => {
    if (sessionId) {
      return Promise.resolve(sessionId);
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    sessionPromiseRef.current = requestJson<VisitSuccess>(
      "/api/analytics/visit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          storedSessionId ? { sessionId: storedSessionId } : {},
        ),
      },
    )
      .then((result) => saveSession(result.data.session_id))
      .finally(() => {
        sessionPromiseRef.current = null;
      });

    return sessionPromiseRef.current;
  }, [saveSession, sessionId]);

  const loadStats = useCallback(async () => {
    try {
      const result = await requestJson<StatsSuccess>("/api/stats");
      setStats({
        totalVisitors: result.data.total_visitors,
        totalQuestions: result.data.total_questions,
        totalFeedback: result.data.total_feedback,
      });
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  useEffect(() => {
    void ensureSession().catch(() => {
      setChatError("Sesi anonim belum dapat dibuat. Silakan muat ulang halaman.");
    });
    void loadStats();
  }, [ensureSession, loadStats]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isChatLoading, messages]);

  const sendQuestion = async (rawQuestion: string) => {
    const trimmedQuestion = rawQuestion.trim();

    if (
      trimmedQuestion.length < 3 ||
      trimmedQuestion.length > 500 ||
      isChatLoading
    ) {
      return;
    }

    setChatError("");
    setQuestion("");
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
      },
    ]);
    setIsChatLoading(true);

    try {
      const activeSessionId = await ensureSession();
      const result = await requestJson<ChatSuccess>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: trimmedQuestion,
        }),
      });

      saveSession(result.data.session_id);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: result.data.answer,
          status: result.data.status,
          sources: result.data.sources,
        },
      ]);
      void loadStats();
    } catch (error) {
      const safeMessage =
        error instanceof Error
          ? error.message
          : "Chatbot belum dapat menjawab. Silakan coba lagi.";
      setChatError(safeMessage);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: safeMessage,
          status: "error",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(question);
  };

  const handleFeedbackSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFeedbackState("sending");
    setFeedbackMessage("");

    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    try {
      const activeSessionId = await ensureSession();
      const result = await requestJson<FeedbackSuccess>("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          message,
        }),
      });

      saveSession(result.data.session_id);
      formElement.reset();
      setFeedbackState("success");
      setFeedbackMessage(
        "Terima kasih. Masukanmu sudah tersimpan dan sangat berarti bagi CoPed.",
      );
      void loadStats();
    } catch (error) {
      setFeedbackState("error");
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Kritik dan saran belum dapat dikirim.",
      );
    }
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#beranda" aria-label="CoPed beranda">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coped-logo-white-full.png" alt="CoPed" />
        </a>
        <nav aria-label="Navigasi utama">
          <a href="#beranda">Beranda</a>
          <a href="#suara-kamu">Suara kamu</a>
        </nav>
        <a className="header-cta" href="#chatbot">
          Mulai bertanya <ArrowIcon />
        </a>
      </header>

      <section className="hero-section" id="beranda">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />
            Konstitusi, lebih mudah dipahami
          </div>
          <h1>
            Kenali hakmu.
            <br />
            <em>Pahami konstitusimu.</em>
          </h1>
          <p className="hero-lead">
            Jelajahi UUD 1945 lewat percakapan yang sederhana. Setiap jawaban
            CoPed dibatasi pada dokumen konstitusi dan dilengkapi rujukan pasal.
          </p>

          <div className="constitution-card">
            <div className="constitution-number">1945</div>
            <div>
              <strong>Undang-Undang Dasar</strong>
              <p>
                Hukum dasar tertulis yang menjadi landasan kehidupan berbangsa
                dan bernegara di Indonesia.
              </p>
            </div>
          </div>

          <div className="hero-proof">
            <div>
              <strong>37</strong>
              <span>Pasal utama</span>
            </div>
            <div>
              <strong>16</strong>
              <span>Bab konstitusi</span>
            </div>
            <div>
              <strong>1</strong>
              <span>Sumber terverifikasi</span>
            </div>
          </div>
        </div>

        <section className="chat-shell" id="chatbot" aria-label="Chatbot UUD 1945">
          <div className="chat-header">
            <div className="bot-mark" aria-hidden="true">
              C
            </div>
            <div>
              <strong>CoPed Assistant</strong>
              <span>
                <i /> Online · Berbasis UUD 1945
              </span>
            </div>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => (
              <article
                className={`message message-${message.role}`}
                key={message.id}
              >
                <div className="message-label">
                  {message.role === "assistant" ? "CoPed" : "Kamu"}
                </div>
                <div className="message-bubble">
                  <p>{message.content}</p>
                  {message.sources && message.sources.length > 0 ? (
                    <details className="sources">
                      <summary>
                        <QuoteIcon />
                        {message.sources.length} rujukan konstitusi
                      </summary>
                      <div className="source-list">
                        {message.sources.map((source) => (
                          <div className="source-item" key={source.chunkId}>
                            <strong>
                              {source.articleNumber
                                ? `Pasal ${source.articleNumber}`
                                : source.chapter ?? "Pembukaan"}
                              {source.paragraphNumber
                                ? ` ayat (${source.paragraphNumber})`
                                : ""}
                            </strong>
                            <p>{source.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}

            {messages.length === 1 ? (
              <div className="suggestions" aria-label="Contoh pertanyaan">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendQuestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {isChatLoading ? (
              <div className="thinking" role="status">
                <span />
                <span />
                <span />
                <p>Menelusuri UUD 1945…</p>
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <form className="chat-form" onSubmit={handleChatSubmit}>
            <label className="sr-only" htmlFor="chat-question">
              Pertanyaan tentang UUD 1945
            </label>
            <textarea
              id="chat-question"
              maxLength={500}
              minLength={3}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Tanyakan sesuatu tentang UUD 1945…"
              rows={2}
              value={question}
            />
            <button
              aria-label="Kirim pertanyaan"
              disabled={isChatLoading || question.trim().length < 3}
              type="submit"
            >
              <SendIcon />
            </button>
          </form>
          <p className="chat-note">
            CoPed hanya menjawab berdasarkan dokumen UUD 1945.
          </p>
          {chatError ? <p className="sr-only">{chatError}</p> : null}
        </section>
      </section>

      <section className="voice-section" id="suara-kamu">
        <div className="voice-intro">
          <div className="eyebrow eyebrow-light">
            <span />
            Dibangun bersama pengguna
          </div>
          <h2>
            Suara kamu,
            <br />
            <em>arah berkembang kami.</em>
          </h2>
          <p>
            CoPed adalah portfolio edukasi yang terus disempurnakan. Ceritakan
            pengalamanmu agar akses terhadap konstitusi makin inklusif.
          </p>

          <div className="stats-grid" aria-label="Statistik CoPed">
            {[
              ["Pengunjung", stats?.totalVisitors],
              ["Pertanyaan", stats?.totalQuestions],
              ["Masukan", stats?.totalFeedback],
            ].map(([label, value]) => (
              <div className="stat-card" key={label}>
                <strong>
                  {typeof value === "number" ? formatCount(value) : "—"}
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {statsError ? (
            <button className="stats-retry" onClick={() => void loadStats()}>
              Muat ulang statistik
            </button>
          ) : null}
        </div>

        <form className="feedback-card" onSubmit={handleFeedbackSubmit}>
          <div className="feedback-heading">
            <span>02</span>
            <div>
              <h3>Kritik &amp; saran</h3>
              <p>Identitas bersifat opsional.</p>
            </div>
          </div>

          <div className="field-row">
            <label>
              Nama <span>opsional</span>
              <input
                autoComplete="name"
                maxLength={80}
                minLength={2}
                name="name"
                placeholder="Nama kamu"
                type="text"
              />
            </label>
            <label>
              Email <span>opsional</span>
              <input
                autoComplete="email"
                maxLength={254}
                name="email"
                placeholder="email@contoh.com"
                type="email"
              />
            </label>
          </div>

          <label>
            Pesan
            <textarea
              maxLength={1000}
              minLength={5}
              name="message"
              placeholder="Apa yang perlu kami tingkatkan?"
              required
              rows={6}
            />
          </label>

          <button
            className="feedback-submit"
            disabled={feedbackState === "sending"}
            type="submit"
          >
            {feedbackState === "sending" ? "Mengirim…" : "Kirim masukan"}
            <ArrowIcon />
          </button>

          {feedbackMessage ? (
            <p
              className={`form-status form-status-${feedbackState}`}
              role="status"
            >
              {feedbackMessage}
            </p>
          ) : null}
        </form>
      </section>

      <footer>
        <a className="brand" href="#beranda" aria-label="Kembali ke beranda">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coped-logo-white-full.png" alt="CoPed" />
        </a>
        <p>Belajar konstitusi, memahami Indonesia.</p>
        <span>© 2026 CoPed · Portfolio project</span>
      </footer>
    </main>
  );
}
