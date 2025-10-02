// API Service untuk koneksi dengan backend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface ChatMessage {
  id?: string;
  question: string;
  answer: string;
  ragSystem: string;
  accuracy: number;
  responseTime: number;
  sources: string[];
  geminiModel: string;
  isError?: boolean;
  errorMessage?: string;
  createdAt: Date;
}

interface ChatRoom {
  roomId: string;
  title: string;
  messages: ChatMessage[];
  isActive: boolean;
  lastActivity: Date;
  messageCount?: number;
  lastMessage?: ChatMessage;
}

interface ChatRoomsResponse {
  success: boolean;
  data: {
    rooms: ChatRoom[];
    total: number;
  };
  message?: string;
}

interface ChatQuestionResponse {
  success: boolean;
  data: {
    question: string;
    answer: string;
    system: string;
    accuracy: number;
    responseTime: number;
    sources: string[];
    geminiModel: string;
    roomId: string | null;
    cached: boolean;
    isError?: boolean;
    errorMessage?: string;
    autoSelected?: boolean;
    legalContextRequired?: boolean;
    isLegalContextRejection?: boolean;
    validationReason?: string;
    contextScore?: number;
  };
  message?: string;
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Chat methods
  async createChatRoom(
    title: string
  ): Promise<{ success: boolean; data: { room: ChatRoom } }> {
    return this.makeRequest("/chat/rooms", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async getChatRooms(): Promise<ChatRoomsResponse> {
    return this.makeRequest("/chat/rooms");
  }

  async getChatRoomMessages(roomId: string): Promise<{
    success: boolean;
    data: {
      room: ChatRoom;
      messages: ChatMessage[];
      pagination: {
        current: number;
        total: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  }> {
    return this.makeRequest(`/chat/rooms/${roomId}/messages`);
  }

  async deleteChatRoom(
    roomId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/chat/rooms/${roomId}`, {
      method: "DELETE",
    });
  }

  async updateChatRoomTitle(
    roomId: string,
    title: string
  ): Promise<{
    success: boolean;
    message: string;
    data: { room: ChatRoom };
  }> {
    return this.makeRequest(`/chat/rooms/${roomId}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  async askQuestion(
    question: string,
    roomId: string,
    ragSystem: "native" | "langchain" | "auto" = "auto"
  ): Promise<ChatQuestionResponse> {
    return this.makeRequest("/chat/ask", {
      method: "POST",
      body: JSON.stringify({ question, roomId, ragSystem }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ success: boolean; message: string }> {
    return this.makeRequest("/health");
  }
}

export const apiService = new ApiService();
export type { ChatMessage, ChatRoom, ChatRoomsResponse, ChatQuestionResponse };
