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

// Interface untuk tipe data
interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface ChatRoom {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ChatMessage[];
}

interface GroupedChats {
  [key: string]: ChatRoom[];
}

export default function ChatPage() {
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    {
      id: "1",
      title: "Pertanyaan tentang UUD 1945",
      lastMessage: "Apa itu pasal 28 UUD 1945?",
      timestamp: new Date(),
      messages: [
        {
          id: "1",
          type: "user",
          content: "Apa itu pasal 28 UUD 1945?",
          timestamp: new Date(),
        },
        {
          id: "2",
          type: "ai",
          content:
            "Pasal 28 UUD 1945 mengatur tentang hak asasi manusia. Pasal ini menjamin berbagai hak fundamental warga negara Indonesia termasuk hak untuk hidup, hak kebebasan beragama, hak atas pendidikan, dan lain-lain.",
          timestamp: new Date(),
        },
      ],
    },
    {
      id: "2",
      title: "Sistem Pemerintahan Indonesia",
      lastMessage: "Bagaimana sistem pemerintahan Indonesia?",
      timestamp: new Date(Date.now() - 86400000), // Yesterday
      messages: [],
    },
  ]);

  const [activeRoom, setActiveRoom] = useState<string | null>("1");
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<"Native" | "LangChain">(
    "Native"
  );
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatRooms]);

  // Group chats by date
  const groupChatsByDate = (chats: ChatRoom[]): GroupedChats => {
    const groups: GroupedChats = {};
    chats.forEach((chat) => {
      const date = chat.timestamp.toLocaleDateString("id-ID", {
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

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !activeRoom) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: currentMessage,
      timestamp: new Date(),
    };

    // Add user message
    setChatRooms((prev) =>
      prev.map((room) =>
        room.id === activeRoom
          ? { ...room, messages: [...room.messages, newMessage] }
          : room
      )
    );

    setCurrentMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `Terima kasih atas pertanyaan Anda tentang "${currentMessage}". Ini adalah respons dari model ${selectedModel}. Saya akan membantu menjelaskan topik tersebut berdasarkan UUD 1945 dan peraturan perundang-undangan yang berlaku.`,
        timestamp: new Date(),
      };

      setChatRooms((prev) =>
        prev.map((room) =>
          room.id === activeRoom
            ? { ...room, messages: [...room.messages, aiResponse] }
            : room
        )
      );
      setIsTyping(false);
    }, 2000);
  };

  const handleNewChat = () => {
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      title: "Chat Baru",
      lastMessage: "",
      timestamp: new Date(),
      messages: [],
    };

    setChatRooms((prev) => [newRoom, ...prev]);
    setActiveRoom(newRoom.id);
  };

  const handleRenameRoom = (roomId: string, newTitle: string) => {
    setChatRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, title: newTitle } : room
      )
    );
    setIsRenaming(null);
    setShowDropdown(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    setChatRooms((prev) => prev.filter((room) => room.id !== roomId));
    if (activeRoom === roomId) {
      setActiveRoom(chatRooms.length > 1 ? chatRooms[0].id : null);
    }
    setShowDropdown(null);
  };

  const getCurrentRoom = () => {
    return chatRooms.find((room) => room.id === activeRoom);
  };

  const groupedChats = groupChatsByDate(chatRooms);

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
                  key={room.id}
                  className={`relative p-1.5 mb-1.5 cursor-pointer transition-all duration-200 ${
                    activeRoom === room.id
                      ? "bg-[#3C3C3C] rounded-lg"
                      : hoveredRoom === room.id
                      ? "bg-[rgba(60,60,60,0.56)] rounded-lg"
                      : ""
                  }`}
                  onMouseEnter={() => setHoveredRoom(room.id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  onClick={() => setActiveRoom(room.id)}
                >
                  {isRenaming === room.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameRoom(room.id, renameValue)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleRenameRoom(room.id, renameValue);
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

                  {(hoveredRoom === room.id || showDropdown === room.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(
                          showDropdown === room.id ? null : room.id
                        );
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <EllipsisHorizontalIcon className="w-3 h-3" />
                    </button>
                  )}

                  {showDropdown === room.id && (
                    <div className="absolute right-0 top-full mt-1 bg-[#3C3C3C] rounded-lg shadow-lg py-1 z-10 min-w-[110px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenaming(room.id);
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
                          handleDeleteRoom(room.id);
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
            setSelectedModel(e.target.value as "Native" | "LangChain")
          }
          className="bg-[#3C3C3C] text-white px-2 py-1.5 rounded-lg poppins-regular border border-gray-600 focus:border-[#F60] outline-none text-xs"
        >
          <option value="Native">Native</option>
          <option value="LangChain">LangChain</option>
        </select>
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Messages Area - Reduced padding */}
        <div className="flex-1 bg-transparent rounded-xl p-2 mb-2 overflow-y-auto chat-messages">
          {activeRoom && getCurrentRoom() ? (
            <div className="space-y-2 max-w-5xl mx-auto">
              {getCurrentRoom()!.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex message-enter ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.type === "ai" && (
                    <div className="flex items-start space-x-2">
                      <Image
                        src="/coped-logo-black-circle.png"
                        alt="AI"
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full mt-1"
                      />
                      <div className="bg-[#2A2A2A] text-white p-2 rounded-lg max-w-2xl poppins-regular text-xs">
                        {message.content}
                      </div>
                    </div>
                  )}
                  {message.type === "user" && (
                    <div className="text-white p-2 rounded-lg max-w-2xl poppins-regular text-xs">
                      {message.content}
                    </div>
                  )}
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
