"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { apiService, ChatMessage, ChatRoom } from "@/services/api";
import FormattedResponse from "@/components/FormattedResponse";

// Interface untuk tipe data
interface GroupedChats {
  [key: string]: ChatRoom[];
}

export default function ChatPage() {
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<"native" | "langchain">(
    "native"
  );
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"error" | "success" | "info">(
    "error"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Toast notification function
  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "error"
  ) => {
    setToastMessage(message);
    setToastType(type);
    // Auto hide toast after 4 seconds
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load chat rooms from API
  useEffect(() => {
    loadChatRooms();
  }, []);

  // Load chat rooms from API
  const loadChatRooms = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getChatRooms();
      if (response.success) {
        setChatRooms(response.data.rooms);
        if (response.data.rooms.length > 0 && !activeRoom) {
          setActiveRoom(response.data.rooms[0].roomId);
        }
      }
    } catch (error) {
      console.error("Failed to load chat rooms:", error);
      showToast("Gagal memuat riwayat chat", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatRooms]);

  // Group chats by date
  const groupChatsByDate = (chats: ChatRoom[]): GroupedChats => {
    const groups: GroupedChats = {};
    chats.forEach((chat) => {
      const date = new Date(chat.lastActivity).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(chat);
    });
    return groups;
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage = currentMessage.trim();

    try {
      // If no active room, create one with the question as title
      let roomId = activeRoom;
      if (!roomId) {
        const newRoom = await createChatWithTitle(userMessage);
        if (newRoom) {
          roomId = newRoom.roomId;
        } else {
          showToast("Gagal membuat chat baru", "error");
          return;
        }
      }

      // Immediately show user message
      setCurrentMessage("");
      setIsTyping(true);

      // Add user message to UI immediately
      const tempMessage: ChatMessage = {
        question: userMessage,
        answer: "", // Temporary empty answer
        ragSystem: selectedModel,
        accuracy: 0,
        responseTime: 0,
        sources: [],
        geminiModel: "",
        isError: false,
        errorMessage: undefined,
        createdAt: new Date(),
      };

      setChatRooms((prev) =>
        prev.map((room) =>
          room.roomId === roomId
            ? {
                ...room,
                messages: [...room.messages, tempMessage],
                lastActivity: new Date(),
                // Update title with first question if it's still "Chat Baru"
                title: room.messages.length === 0 ? userMessage : room.title,
              }
            : room
        )
      );

      // Smart RAG selection based on question content
      let ragSystemToUse: "native" | "langchain" | "auto" =
        selectedModel === "native" ? "native" : "langchain";

      // Override with auto-select for legal questions for better accuracy
      const legalKeywords = [
        "pasal",
        "undang",
        "konstitusi",
        "hukum",
        "peraturan",
        "UUD",
        "ayat",
      ];
      const isLegalQuestion = legalKeywords.some((keyword) =>
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      // Use auto-select for better accuracy on legal questions
      if (isLegalQuestion) {
        ragSystemToUse = "auto";
      }

      const response = await apiService.askQuestion(
        userMessage,
        roomId,
        ragSystemToUse
      );

      if (response.success) {
        // Update the last message with the actual response
        setChatRooms((prev) =>
          prev.map((room) =>
            room.roomId === roomId
              ? {
                  ...room,
                  messages: room.messages.map((msg, index) =>
                    index === room.messages.length - 1
                      ? {
                          ...msg,
                          answer: response.data.answer,
                          ragSystem: response.data.system,
                          accuracy: response.data.accuracy,
                          responseTime: response.data.responseTime,
                          sources: response.data.sources,
                          geminiModel: response.data.geminiModel,
                          isError: response.data.isError,
                          errorMessage: response.data.errorMessage,
                        }
                      : msg
                  ),
                  lastActivity: new Date(),
                  // Update title for non-legal questions
                  title:
                    response.data.isLegalContextRejection &&
                    room.messages.length <= 1
                      ? "🏛️ Konsultasi di Luar Bidang Hukum"
                      : room.title,
                }
              : room
          )
        );
      } else {
        showToast("Gagal mengirim pesan", "error");
        // Remove the temporary message if API fails
        setChatRooms((prev) =>
          prev.map((room) =>
            room.roomId === activeRoom
              ? {
                  ...room,
                  messages: room.messages.slice(0, -1),
                }
              : room
          )
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      showToast("Gagal mengirim pesan", "error");
      // Remove the temporary message if error occurs
      setChatRooms((prev) =>
        prev.map((room) =>
          room.roomId === activeRoom
            ? {
                ...room,
                messages: room.messages.slice(0, -1),
              }
            : room
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await apiService.createChatRoom("Chat Baru");
      if (response.success) {
        const newRoom = response.data.room;
        setChatRooms((prev) => [newRoom, ...prev]);
        setActiveRoom(newRoom.roomId);
        showToast("Chat baru berhasil dibuat", "success");
        return newRoom;
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
      showToast("Gagal membuat chat baru", "error");
    }
    return null;
  };

  const createChatWithTitle = async (title: string) => {
    try {
      const response = await apiService.createChatRoom(title);
      if (response.success) {
        const newRoom = response.data.room;
        setChatRooms((prev) => [newRoom, ...prev]);
        setActiveRoom(newRoom.roomId);
        return newRoom;
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
      showToast("Gagal membuat chat baru", "error");
    }
    return null;
  };

  const handleRenameRoom = async (roomId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setIsRenaming(null);
      return;
    }

    try {
      const response = await apiService.updateChatRoomTitle(
        roomId,
        newTitle.trim()
      );
      if (response.success) {
        setChatRooms((prev) =>
          prev.map((room) =>
            room.roomId === roomId ? { ...room, title: newTitle.trim() } : room
          )
        );
      } else {
        showToast("Gagal mengubah nama chat", "error");
      }
    } catch (error) {
      console.error("Failed to rename room:", error);
      showToast("Gagal mengubah nama chat", "error");
    }
    setIsRenaming(null);
    setShowDropdown(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const response = await apiService.deleteChatRoom(roomId);
      if (response.success) {
        setChatRooms((prev) => prev.filter((room) => room.roomId !== roomId));
        if (activeRoom === roomId) {
          const remainingRooms = chatRooms.filter(
            (room) => room.roomId !== roomId
          );
          setActiveRoom(
            remainingRooms.length > 0 ? remainingRooms[0].roomId : null
          );
        }
        setShowDropdown(null);
      } else {
        showToast("Gagal menghapus chat", "error");
      }
    } catch (error) {
      console.error("Failed to delete room:", error);
      showToast("Gagal menghapus chat", "error");
    }
  };

  const getCurrentRoom = () => {
    return chatRooms.find((room) => room.roomId === activeRoom);
  };

  const groupedChats = groupChatsByDate(chatRooms);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-white">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black p-2 relative">
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white p-2 rounded-lg transition-colors border border-gray-600"
      >
        {isSidebarOpen ? (
          <XMarkIcon className="w-5 h-5" />
        ) : (
          <Bars3Icon className="w-5 h-5" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#2A2A2A] p-3 flex flex-col z-40 transition-transform duration-300 ease-in-out rounded-r-xl ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="mb-3 mt-12">
          <Image
            src="/coped-logo-white-full.png"
            alt="CoPed Logo"
            width={80}
            height={16}
            className="h-4 w-auto"
          />
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="flex items-center justify-between w-full bg-[#F60] text-white px-2 py-1.5 rounded-lg mb-3 hover:bg-[#e55500] transition-colors poppins-medium text-xs"
        >
          <span>Tambahkan Chat</span>
          <PencilIcon className="w-3 h-3" />
        </button>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-white poppins-medium mb-2 text-xs">
            History Chat
          </h3>

          {Object.entries(groupedChats).map(([date, chats]) => (
            <div key={date} className="mb-2">
              <h4 className="text-gray-400 text-[10px] poppins-regular mb-1">
                {date}
              </h4>
              {chats.map((room) => (
                <div
                  key={room.roomId}
                  className={`relative p-1.5 mb-1.5 cursor-pointer transition-all duration-200 ${
                    activeRoom === room.roomId
                      ? "bg-[#3C3C3C] rounded-lg"
                      : hoveredRoom === room.roomId
                      ? "bg-[rgba(60,60,60,0.56)] rounded-lg"
                      : ""
                  }`}
                  onMouseEnter={() => setHoveredRoom(room.roomId)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  onClick={() => setActiveRoom(room.roomId)}
                >
                  {isRenaming === room.roomId ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameRoom(room.roomId, renameValue)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleRenameRoom(room.roomId, renameValue);
                        }
                      }}
                      className="w-full bg-transparent text-white poppins-regular text-[10px] outline-none"
                      autoFocus
                    />
                  ) : (
                    <p className="text-white poppins-regular text-[10px] truncate pr-4">
                      {room.title}
                    </p>
                  )}

                  {(hoveredRoom === room.roomId ||
                    showDropdown === room.roomId) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(
                          showDropdown === room.roomId ? null : room.roomId
                        );
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <EllipsisHorizontalIcon className="w-3 h-3" />
                    </button>
                  )}

                  {showDropdown === room.roomId && (
                    <div className="absolute right-0 top-full mt-1 bg-[#3C3C3C] rounded-lg shadow-lg py-1 z-10 min-w-[110px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenaming(room.roomId);
                          setRenameValue(room.title);
                          setShowDropdown(null);
                        }}
                        className="block w-full text-left px-2 py-1 text-white hover:bg-[#4C4C4C] poppins-regular text-[10px]"
                      >
                        Ganti nama
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.roomId);
                        }}
                        className="block w-full text-left px-2 py-1 text-red-400 hover:bg-[#4C4C4C] poppins-regular text-[10px]"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Back to Home Button */}
        <button
          onClick={() => router.push("/home")}
          className="w-full bg-[#F60] text-white px-2 py-1.5 rounded-lg hover:bg-[#e55500] transition-colors poppins-medium mt-2 text-xs flex items-center justify-center gap-1"
        >
          <ArrowLeftIcon className="w-3 h-3" />
          <span>Kembali</span>
        </button>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area - Full width when sidebar is closed */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:ml-64" : "ml-0"
        }`}
      >
        {/* Top bar with model selection */}
        <div className="flex items-center justify-between p-2 pt-16 md:pt-4">
          <div></div> {/* Spacer */}
          {/* Model Selection */}
          <select
            value={selectedModel}
            onChange={(e) =>
              setSelectedModel(e.target.value as "native" | "langchain")
            }
            className="bg-[#3C3C3C] text-white px-3 py-2 rounded-lg poppins-regular border border-gray-600 focus:border-[#F60] outline-none text-xs"
          >
            <option value="native">Native</option>
            <option value="langchain">LangChain</option>
          </select>
        </div>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 bg-transparent rounded-xl p-4 mb-2 overflow-y-auto chat-messages">
            {activeRoom && getCurrentRoom() ? (
              <div className="space-y-4">
                {getCurrentRoom()!.messages.map((message, index) => (
                  <div key={index} className="space-y-4">
                    {/* User Question - Right side */}
                    <div className="flex justify-end">
                      <div className="bg-[#F60] text-white p-3 rounded-2xl rounded-tr-md max-w-2xl poppins-regular text-sm">
                        {message.question}
                      </div>
                    </div>

                    {/* AI Answer - Left side (only show if answer exists) */}
                    {message.answer && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-3">
                          <Image
                            src="/coped-logo-black-circle.png"
                            alt="AI"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full mt-1 flex-shrink-0"
                          />
                          <div className="bg-[#2A2A2A] text-white p-3 rounded-2xl rounded-tl-md max-w-2xl poppins-regular text-sm">
                            <FormattedResponse
                              content={message.answer}
                              className="mb-0"
                            />

                            {/* Simplified metadata with box design */}
                            <div className="mt-3 flex justify-between items-center">
                              {/* System box - Left */}
                              <div className="bg-gray-700/50 px-2 py-1 rounded-lg border border-gray-600">
                                <span className="text-xs text-gray-300 font-medium">
                                  {message.ragSystem === "native"
                                    ? "Native RAG"
                                    : message.ragSystem === "langchain_enhanced"
                                    ? "LangChain Enhanced"
                                    : message.ragSystem === "langchain"
                                    ? "LangChain"
                                    : message.ragSystem || "Unknown"}
                                  {/* Show auto-selected indicator */}
                                  {(message as any).autoSelected
                                    ? " (Auto)"
                                    : ""}
                                </span>
                              </div>

                              {/* Response time box - Right */}
                              <div className="bg-gray-700/50 px-2 py-1 rounded-lg border border-gray-600">
                                <span className="text-xs text-gray-300 font-medium">
                                  {message.responseTime
                                    ? message.responseTime >= 60000
                                      ? `${Math.round(
                                          message.responseTime / 60000
                                        )}m ${Math.round(
                                          (message.responseTime % 60000) / 1000
                                        )}s`
                                      : `${Math.round(
                                          message.responseTime / 1000
                                        )}s`
                                    : "0s"}
                                </span>
                              </div>

                              <div></div>
                            </div>

                            {/* Error message if any */}
                            {message.isError && (
                              <div
                                className={`mt-2 rounded-lg px-2 py-1 border ${
                                  message.errorMessage?.includes(
                                    "konteks hukum"
                                  )
                                    ? "bg-orange-900/30 border-orange-700"
                                    : "bg-red-900/30 border-red-700"
                                }`}
                              >
                                <span
                                  className={`text-xs ${
                                    message.errorMessage?.includes(
                                      "konteks hukum"
                                    )
                                      ? "text-orange-300"
                                      : "text-red-300"
                                  }`}
                                >
                                  {message.errorMessage?.includes(
                                    "konteks hukum"
                                  )
                                    ? "⚠️ Legal Context: "
                                    : "Error: "}
                                  {message.errorMessage}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <Image
                        src="/coped-logo-black-circle.png"
                        alt="AI"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full mt-1 flex-shrink-0"
                      />
                      <div className="bg-[#2A2A2A] text-white p-3 rounded-2xl rounded-tl-md">
                        <div className="typing-indicator">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-2xl">
                  <p className="text-gray-400 poppins-regular text-sm mb-6">
                    Mulai chat dengan mengetik pertanyaan Anda di bawah atau
                    pilih contoh pertanyaan:
                  </p>

                  {/* Template Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {[
                      "Apa isi dari pasal 1 ayat 1?",
                      "Apa yang dimaksud dengan kedaulatan rakyat?",
                      "Bagaimana sistem pemerintahan menurut UUD 1945?",
                      "Apa saja hak asasi manusia yang dijamin dalam UUD 1945?",
                    ].map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMessage(question)}
                        className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white p-3 rounded-lg transition-colors poppins-regular text-xs text-left border border-gray-600 hover:border-[#F60]"
                      >
                        {question}
                      </button>
                    ))}
                  </div>

                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                    <p className="text-blue-300 poppins-regular text-xs mb-2">
                      Fokus Hukum Konstitusi Indonesia
                    </p>
                    <p className="text-gray-400 poppins-regular text-xs">
                      • Hanya menjawab pertanyaan tentang UUD 1945 dan hukum
                      konstitusi
                      <br />
                      • Menggunakan UUD 1945 sebagai sumber tunggal untuk
                      akurasi maksimal
                      <br />• Pertanyaan di luar konteks hukum akan ditolak
                      secara otomatis
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input - Always show, even when no active room */}
          <div className="p-2">
            <div className="relative w-[600px] mx-auto">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                placeholder="tanyakan sesuatu..."
                className="w-full bg-transparent text-white px-3 py-2 pr-10 rounded-lg poppins-regular placeholder-gray-400 border border-gray-600 focus:border-[#F60] outline-none text-xs"
              />
              <button
                onClick={handleSendMessage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#F60] hover:text-[#e55500] transition-colors"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm transform transition-all duration-300 ease-in-out animate-slideInUp`}
        >
          <div
            className={`flex items-center p-4 rounded-lg shadow-lg border ${
              toastType === "error"
                ? "bg-red-900/90 border-red-700 text-red-100"
                : toastType === "success"
                ? "bg-green-900/90 border-green-700 text-green-100"
                : "bg-blue-900/90 border-blue-700 text-blue-100"
            }`}
          >
            <div className="flex items-center">
              {toastType === "error" && (
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {toastType === "success" && (
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {toastType === "info" && (
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="text-sm font-medium poppins-regular">
                {toastMessage}
              </span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-4 text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
