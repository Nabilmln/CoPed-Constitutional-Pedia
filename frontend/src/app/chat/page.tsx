"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { apiService, ChatMessage, ChatRoom } from "@/services/api";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setError("Gagal memuat riwayat chat");
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
    if (!currentMessage.trim() || !activeRoom) return;

    try {
      setIsTyping(true);
      setCurrentMessage("");

      const response = await apiService.askQuestion(
        currentMessage.trim(),
        activeRoom,
        selectedModel === "native" ? "native" : "langchain"
      );

      if (response.success) {
        // Reload the current room messages to get the updated conversation
        const roomResponse = await apiService.getChatRoomMessages(activeRoom);
        if (roomResponse.success) {
          setChatRooms((prev) =>
            prev.map((room) =>
              room.roomId === activeRoom
                ? {
                    ...room,
                    messages: roomResponse.data.messages,
                    lastActivity: new Date(),
                  }
                : room
            )
          );
        }
      } else {
        setError("Gagal mengirim pesan");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("Gagal mengirim pesan");
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
      }
    } catch (error) {
      console.error("Failed to create new chat:", error);
      setError("Gagal membuat chat baru");
    }
  };

  const handleRenameRoom = async (roomId: string, newTitle: string) => {
    try {
      const response = await apiService.updateChatRoomTitle(roomId, newTitle);
      if (response.success) {
        setChatRooms((prev) =>
          prev.map((room) =>
            room.roomId === roomId ? { ...room, title: newTitle } : room
          )
        );
      }
    } catch (error) {
      console.error("Failed to rename room:", error);
      setError("Gagal mengubah nama chat");
    }
    setIsRenaming(null);
    setShowDropdown(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await apiService.deleteChatRoom(roomId);
      setChatRooms((prev) => prev.filter((room) => room.roomId !== roomId));
      if (activeRoom === roomId) {
        setActiveRoom(chatRooms.length > 1 ? chatRooms[0].roomId : null);
      }
      setShowDropdown(null);
    } catch (error) {
      console.error("Failed to delete room:", error);
      setError("Gagal menghapus chat");
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
    <div className="flex h-screen bg-black p-2">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2A2A2A] rounded-xl p-3 mr-2 flex flex-col">
        {/* Logo */}
        <div className="mb-3">
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

      {/* Model Selection - Just the dropdown */}
      <div className="mr-2 flex items-start">
        <select
          value={selectedModel}
          onChange={(e) =>
            setSelectedModel(e.target.value as "native" | "langchain")
          }
          className="bg-[#3C3C3C] text-white px-2 py-1.5 rounded-lg poppins-regular border border-gray-600 focus:border-[#F60] outline-none text-xs"
        >
          <option value="native">Native</option>
          <option value="langchain">LangChain</option>
        </select>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500 text-white p-2 mb-2 rounded-lg text-xs">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Messages Area - Reduced padding */}
        <div className="flex-1 bg-transparent rounded-xl p-2 mb-2 overflow-y-auto chat-messages">
          {activeRoom && getCurrentRoom() ? (
            <div className="space-y-2 max-w-5xl mx-auto">
              {getCurrentRoom()!.messages.map((message, index) => (
                <div key={index} className="space-y-2">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="text-white p-2 rounded-lg max-w-2xl poppins-regular text-xs">
                      {message.question}
                    </div>
                  </div>

                  {/* AI Answer */}
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2">
                      <Image
                        src="/coped-logo-black-circle.png"
                        alt="AI"
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full mt-1"
                      />
                      <div className="bg-[#2A2A2A] text-white p-2 rounded-lg max-w-2xl poppins-regular text-xs">
                        {message.answer}

                        {/* Message metadata */}
                        <div className="mt-2 text-xs text-gray-400 border-t border-gray-600 pt-2">
                          <div className="flex justify-between items-center">
                            <span>Model: {message.geminiModel}</span>
                            <span>
                              Akurasi: {message.accuracy?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span>Sistem: {message.ragSystem}</span>
                            <span>Waktu: {message.responseTime}ms</span>
                          </div>
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-1">
                              <span>Sumber: {message.sources.join(", ")}</span>
                            </div>
                          )}
                          {message.isError && (
                            <div className="mt-1 text-red-400">
                              Error: {message.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <Image
                      src="/coped-logo-black-circle.png"
                      alt="AI"
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full mt-1"
                    />
                    <div className="bg-[#2A2A2A] text-white p-2 rounded-lg">
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
              <p className="text-gray-400 poppins-regular text-xs">
                Pilih atau buat chat baru untuk memulai
              </p>
            </div>
          )}
        </div>

        {/* Message Input - Reduced padding */}
        {activeRoom && (
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
                placeholder="apa itu kewarganegaraan?"
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
        )}
      </main>
    </div>
  );
}
