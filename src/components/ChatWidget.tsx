import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc, getDocs, where } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

type ChatMode = "ai" | "admin";

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "admin" | "ai";
  createdAt: any;
}

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("ai");
  const [input, setInput] = useState("");
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    { id: "1", text: "Xin chào! Tôi là trợ lý ảo của Nuôi Em. Tôi có thể giúp gì cho bạn?", sender: "ai", createdAt: new Date() }
  ]);
  const [adminMessages, setAdminMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatContainerRef.current && !chatContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, adminMessages, isOpen, mode]);

  // Load admin messages if authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || mode !== "admin") return;

    const chatRef = doc(db, "chats", user.UID);
    
    // Ensure chat document exists
    const initChat = async () => {
      const snap = await getDoc(chatRef);
      if (!snap.exists()) {
        await setDoc(chatRef, {
          userId: user.UID,
          userName: user.fullName || "Người dùng",
          userEmail: user.email,
          updatedAt: serverTimestamp(),
          unreadAdmin: 0,
          unreadUser: 0
        });
      } else {
        // Mark as read for user
        await updateDoc(chatRef, { unreadUser: 0 });
      }
    };
    initChat();

    const q = query(collection(db, "chats", user.UID, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setAdminMessages(msgs);
    });

    return () => unsubscribe();
  }, [isAuthenticated, user, mode]);

  const suggestedQuestions = [
    "Làm sao để quyên góp?",
    "Làm sao biết dự án là thật?",
    "Tôi muốn tạo dự án từ thiện",
    "Nuôi Em có thu phí không?"
  ];

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    if (mode === "ai") {
      const newUserMsg: ChatMessage = { id: Date.now().toString(), text: textToSend, sender: "user", createdAt: new Date() };
      setAiMessages(prev => [...prev, newUserMsg]);
      setIsAiTyping(true);

      try {
        // Fetch context data for RAG
        const campaignsSnap = await getDocs(query(collection(db, "campaigns"), where("status", "==", "approved")));
        const orgsSnap = await getDocs(collection(db, "organizations"));
        
        const campaigns = campaignsSnap.docs.map(doc => doc.data());
        const orgs = orgsSnap.docs.map(doc => doc.data());

        const contextInfo = `
Thông tin các dự án đang hoạt động:
${campaigns.map(c => `- ${c.title}: Mục tiêu ${c.goal} VND, Đã quyên góp ${c.raised || 0} VND. Mô tả: ${c.description?.substring(0, 150)}...`).join('\n')}

Thông tin các tổ chức từ thiện:
${orgs.map(o => `- ${o.name}: ${o.description?.substring(0, 150)}...`).join('\n')}
`;

        const systemInstruction = `Bạn là trợ lý ảo của nền tảng từ thiện Nuôi Em. Nhiệm vụ của bạn là hướng dẫn người dùng cách sử dụng trang web, gợi ý dự án quyên góp và giải đáp thắc mắc. Hãy trả lời ngắn gọn, thân thiện, hữu ích và bằng tiếng Việt.

HƯỚNG DẪN SỬ DỤNG TRANG WEB NUÔI EM (Dành cho bạn tham khảo để hướng dẫn người dùng):
1. Khách (Chưa đăng nhập):
- Xem danh sách dự án tại trang chủ hoặc tab "Dự án".
- Đọc tin tức và bài viết cộng đồng.
- Đăng ký/Đăng nhập ở góc phải màn hình.
- Quyên góp: Vào chi tiết dự án -> Bấm "Quyên góp ngay" -> Nhập số tiền -> Quét mã QR thanh toán -> Thanh toán thành công".

2. Người dùng (Đã đăng nhập - Role 1):
- Quyên góp: Vào chi tiết dự án -> Bấm "Quyên góp ngay" -> Nhập số tiền -> Quét mã QR thanh toán -> Thanh toán thành công".
- Cộng đồng: Vào tab "Cộng đồng" -> Viết bài chia sẻ (chờ Admin duyệt) -> Like/Comment bài người khác.
- Đăng ký Tổ chức: Vào "Đăng ký tổ chức" -> Điền thông tin, tải lên logo và giấy tờ chứng thực (PDF/Ảnh) -> Chờ Admin duyệt.
- Hỗ trợ: Mở Chat Widget -> Chọn "Chat với Admin" để nhắn tin trực tiếp.

3. Tổ chức (Role 2):
- Tạo dự án: Vào "Quản lý dự án" -> Bấm "Tạo dự án mới" -> Điền thông tin (Tên, mục tiêu, ngày kết thúc, ảnh bìa) -> Chờ Admin duyệt.
- Quản lý dự án: Theo dõi tiến độ quyên góp của các dự án mình quản lý trong "Hồ sơ cá nhân".

CÂU HỎI THƯỜNG GẶP (FAQ) ĐỂ BẠN TRẢ LỜI NGƯỜI DÙNG:
- Về tính minh bạch: "Tất cả các tổ chức trên Nuôi Em đều phải cung cấp giấy tờ chứng thực pháp lý và được Ban Quản Trị (Admin) kiểm duyệt khắt khe. Các dự án gây quỹ cũng phải thông qua phê duyệt của Admin trước khi hiển thị lên trang chủ để đảm bảo tính minh bạch 100%."
- Về sự cố thanh toán: "Hiện tại hệ thống hỗ trợ thanh toán qua mã QR chuyển khoản ngân hàng. Nếu bạn đã chuyển khoản nhưng chưa thấy cập nhật, vui lòng chờ ít phút để hệ thống đồng bộ, hoặc mở tab 'Chat với Admin' và gửi kèm hình ảnh biên lai để được hỗ trợ xử lý ngay lập tức."
- Về chính sách nền tảng: "100% số tiền quyên góp sẽ được chuyển đến tay người thụ hưởng, nền tảng Nuôi Em không thu bất kỳ khoản phí nào. Nếu dự án hết hạn chưa đủ mục tiêu, số tiền vẫn sẽ được giải ngân cho tổ chức để thực hiện một phần dự án."
- Về bài viết cộng đồng: "Mọi bài viết trên cộng đồng đều cần Admin duyệt để đảm bảo nội dung phù hợp, thời gian duyệt thường trong vòng 24h."

Dưới đây là thông tin dữ liệu thực tế từ hệ thống để bạn tham khảo và trả lời người dùng:
${contextInfo}
`;

        const apiKey = typeof process !== 'undefined' && process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : import.meta.env.VITE_GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey || "" });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: textToSend,
          config: {
            systemInstruction: systemInstruction
          }
        });

        const newAiMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: response.text || "Xin lỗi, tôi không thể trả lời lúc này.", sender: "ai", createdAt: new Date() };
        setAiMessages(prev => [...prev, newAiMsg]);
      } catch (error) {
        console.error("AI Error:", error);
        const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: "Xin lỗi, đã có lỗi xảy ra khi kết nối với AI.", sender: "ai", createdAt: new Date() };
        setAiMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsAiTyping(false);
      }
    } else {
      if (!isAuthenticated || !user) {
        alert("Bạn cần đăng nhập để chat với Admin!");
        return;
      }

      // Add to Firestore
      const msgRef = collection(db, "chats", user.UID, "messages");
      await addDoc(msgRef, {
        text: textToSend,
        sender: "user",
        createdAt: serverTimestamp()
      });

      // Update chat doc
      const chatRef = doc(db, "chats", user.UID);
      await updateDoc(chatRef, {
        lastMessage: textToSend,
        updatedAt: serverTimestamp(),
        unreadAdmin: 1 // Increment in a real app, but setting to 1 is fine for simple notification
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const currentMessages = mode === "ai" ? aiMessages : adminMessages;

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={chatContainerRef}>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-pink-600 text-white rounded-full shadow-lg hover:bg-pink-700 hover:scale-105 transition-all flex items-center justify-center"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[500px] flex flex-col border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-pink-600 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                {mode === "ai" ? <Bot className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm">Hỗ trợ trực tuyến</h3>
                <p className="text-xs text-pink-100">{mode === "ai" ? "Trợ lý AI Nuôi Em" : "Đội ngũ Admin"}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-pink-100 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-2 bg-gray-50 border-b border-gray-100 shrink-0">
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${mode === "ai" ? "bg-white text-pink-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Bot className="w-4 h-4" /> Chat với AI
            </button>
            <button
              onClick={() => setMode("admin")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${mode === "admin" ? "bg-white text-pink-600 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              <UserCircle className="w-4 h-4" /> Chat với Admin
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {mode === "admin" && !isAuthenticated && (
              <div className="text-center text-sm text-gray-500 mt-10">
                Vui lòng <a href="/dang-nhap" className="text-pink-600 font-bold hover:underline">đăng nhập</a> để chat với Admin.
              </div>
            )}
            
            {(mode === "ai" || isAuthenticated) && currentMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === "user" ? "bg-pink-600 text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* Suggested Questions */}
            {mode === "ai" && aiMessages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(q)}
                    className="text-xs bg-pink-50 text-pink-600 border border-pink-100 px-3 py-1.5 rounded-full hover:bg-pink-100 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {isAiTyping && mode === "ai" && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                  <span className="text-xs text-gray-500">AI đang gõ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "admin" && !isAuthenticated ? "Vui lòng đăng nhập..." : "Nhập tin nhắn..."}
                disabled={mode === "admin" && !isAuthenticated}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || (mode === "admin" && !isAuthenticated)}
                className="w-10 h-10 bg-pink-600 text-white rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:hover:bg-pink-600 shrink-0"
              >
                <Send className="w-4 h-4 ml-1" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
