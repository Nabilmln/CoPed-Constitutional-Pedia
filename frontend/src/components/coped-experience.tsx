"use client";

import {
  Fragment,
  FormEvent,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

type Testimonial = {
  name: string;
  message: string;
  created_at: string;
};

type TestimonialsSuccess = {
  success: true;
  data: { testimonials: Testimonial[] };
};

const EMPTY_TESTIMONIALS: Testimonial[] = [
  {
    name: "Ruang untuk suaramu",
    message:
      "Testimoni pengguna yang telah ditinjau akan tampil di sini. Bagikan pengalamanmu pada form di bawah.",
    created_at: "",
  },
  {
    name: "CoPed",
    message:
      "Membantu lebih banyak orang memahami konstitusi dimulai dari pengalaman setiap pengguna.",
    created_at: "",
  },
  {
    name: "Testimoni terkurasi",
    message:
      "Setiap pesan ditinjau sebelum ditampilkan agar ruang ini tetap aman dan relevan.",
    created_at: "",
  },
];

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

const ChevronIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m8 10 4 4 4-4" />
  </svg>
);

const renderInlineMarkdown = (text: string): ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={`${part}-${index}`}>{part}</Fragment>
      ),
    );

const RichAnswer = ({ content }: { content: string }) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const bulletMatch = line.match(/^(?:[-*•])\s+(.+)$/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch || numberedMatch) {
      const ordered = Boolean(numberedMatch);
      const items: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index];
        const currentMatch = ordered
          ? currentLine.match(/^\d+[.)]\s+(.+)$/)
          : currentLine.match(/^(?:[-*•])\s+(.+)$/);

        if (!currentMatch) {
          index -= 1;
          break;
        }

        items.push(currentMatch[1]);
        index += 1;
      }

      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag className="answer-list" key={`list-${blocks.length}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    blocks.push(
      headingMatch ? (
        <h4 key={`heading-${blocks.length}`}>
          {renderInlineMarkdown(headingMatch[1])}
        </h4>
      ) : (
        <p key={`paragraph-${blocks.length}`}>
          {renderInlineMarkdown(line)}
        </p>
      ),
    );
  }

  return <div className="answer-content">{blocks}</div>;
};

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
  const [testimonials, setTestimonials] =
    useState<Testimonial[]>(EMPTY_TESTIMONIALS);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

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

  const loadTestimonials = useCallback(async () => {
    try {
      const result =
        await requestJson<TestimonialsSuccess>("/api/testimonials");
      const shuffled = [...result.data.testimonials].sort(
        () => Math.random() - 0.5,
      );
      setTestimonials(
        shuffled.length > 0 ? shuffled : EMPTY_TESTIMONIALS,
      );
      setActiveTestimonial(0);
    } catch {
      setTestimonials(EMPTY_TESTIMONIALS);
    }
  }, []);

  useEffect(() => {
    void ensureSession().catch(() => {
      setChatError("Sesi anonim belum dapat dibuat. Silakan muat ulang halaman.");
    });
    void loadStats();
    void loadTestimonials();
  }, [ensureSession, loadStats, loadTestimonials]);

  useEffect(() => {
    const container = chatMessagesRef.current;

    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isChatLoading, messages]);

  useEffect(() => {
    if (testimonials.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveTestimonial(
        (current) => (current + 1) % testimonials.length,
      );
    }, 3_800);

    return () => window.clearInterval(interval);
  }, [testimonials.length]);

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
    const message = String(form.get("message") ?? "").trim();

    try {
      const activeSessionId = await ensureSession();
      const result = await requestJson<FeedbackSuccess>("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          ...(name ? { name } : {}),
          message,
        }),
      });

      saveSession(result.data.session_id);
      formElement.reset();
      setFeedbackState("success");
      setFeedbackMessage(
        "Terima kasih. Testimonimu tersimpan dan akan tampil setelah ditinjau.",
      );
      void loadStats();
    } catch (error) {
      setFeedbackState("error");
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Testimoni belum dapat dikirim.",
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
          <a href="#chatbot">Chatbot</a>
          <a href="#testimoni">Testimoni</a>
        </nav>
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

        <div className="testimonial-showcase" aria-label="Testimoni pengguna">
          <div className="testimonial-heading">
            <span>Impresi pengguna</span>
            <strong>Apa kata mereka?</strong>
          </div>
          <div className="testimonial-wheel">
            {testimonials.map((testimonial, index) => {
              let offset =
                (index - activeTestimonial + testimonials.length) %
                testimonials.length;

              if (offset > testimonials.length / 2) {
                offset -= testimonials.length;
              }

              if (Math.abs(offset) > 2) {
                return null;
              }

              return (
                <article
                  className="testimonial-slide"
                  key={`${testimonial.name}-${testimonial.message}`}
                  style={
                    {
                      "--testimonial-offset": offset,
                    } as CSSProperties
                  }
                  data-position={offset}
                >
                  <QuoteIcon />
                  <p>{testimonial.message}</p>
                  <div className="testimonial-author">
                    <span>{testimonial.name}</span>
                    <i>Pengguna CoPed</i>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="testimonial-note">
            Ditampilkan secara acak setelah melalui peninjauan.
          </p>
        </div>
      </section>

      <aside className="bridge-banner" aria-label="Prinsip CoPed">
        <span>01</span>
        <p>
          Bukan menggantikan konstitusi,
          <strong> tetapi mendekatkan maknanya.</strong>
        </p>
        <div aria-hidden="true">CoPed · UUD 1945</div>
      </aside>

      <section className="chat-stage" id="chatbot">
        <div className="section-heading">
          <div className="eyebrow">
            <span />
            Tanya langsung pada dokumen
          </div>
          <h2>
            Satu ruang untuk
            <em> memahami UUD 1945.</em>
          </h2>
          <p>
            Ajukan pertanyaan dan buka rujukan pasal pada setiap jawaban.
          </p>
        </div>

        <section className="chat-shell" aria-label="Chatbot UUD 1945">
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

          <div
            className="chat-messages"
            aria-live="polite"
            ref={chatMessagesRef}
          >
            {messages.map((message) => (
              <article
                className={`message message-${message.role}`}
                key={message.id}
              >
                <div className="message-label">
                  {message.role === "assistant" ? "CoPed" : "Kamu"}
                </div>
                <div className="message-bubble">
                  {message.role === "assistant" ? (
                    <RichAnswer content={message.content} />
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.sources && message.sources.length > 0 ? (
                    <details className="sources">
                      <summary>
                        <span>
                          <QuoteIcon />
                          {message.sources.length} rujukan konstitusi
                        </span>
                        <ChevronIcon />
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

      <aside className="bridge-banner" aria-label="Prinsip CoPed">
        <span>02</span>
        <p>
          Teknologi yang baik dimulai
          <strong> dari suara penggunanya.</strong>
        </p>
        <div aria-hidden="true">CoPed · Tumbuh bersama</div>
      </aside>

      <section className="voice-section" id="testimoni">
        <div className="voice-intro">
          <div className="eyebrow eyebrow-light">
            <span />
            Dibangun bersama pengguna
          </div>
          <h2>
            Pengalamanmu,
            <br />
            <em>berarti bagi kami.</em>
          </h2>
          <p>
            Ceritakan kesanmu setelah menggunakan CoPed. Testimoni yang sudah
            ditinjau akan menjadi bagian dari halaman ini.
          </p>

          <div className="stats-grid" aria-label="Statistik CoPed">
            {[
              ["Pengunjung", stats?.totalVisitors],
              ["Pertanyaan", stats?.totalQuestions],
              ["Testimoni", stats?.totalFeedback],
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
              <h3>Bagikan testimoni</h3>
              <p>Nama boleh dikosongkan.</p>
            </div>
          </div>

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
            Pengalaman menggunakan CoPed
            <textarea
              maxLength={1000}
              minLength={5}
              name="message"
              placeholder="Bagaimana pengalamanmu menggunakan CoPed?"
              required
              rows={6}
            />
          </label>

          <button
            className="feedback-submit"
            disabled={feedbackState === "sending"}
            type="submit"
          >
            {feedbackState === "sending" ? "Mengirim…" : "Kirim testimoni"}
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
        <div className="footer-definition">
          <strong>Tentang CoPed</strong>
          <p>
            Ruang belajar berbasis RAG untuk memahami UUD 1945 melalui jawaban
            yang selalu merujuk pada dokumen konstitusi.
          </p>
        </div>
        <span>© 2026 CoPed · Portfolio project</span>
      </footer>
    </main>
  );
}
