import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { Heart, Search, Menu, User, Bell, LogOut, CheckCircle, MessageCircle, FileText, Star, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Notification } from "../types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import OrganizationRequestModal from "./OrganizationRequestModal";
import ChatWidget from "./ChatWidget";

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'system' | 'personal'>('system');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const systemNotifs = notifications.filter(n => ['new_campaign', 'new_news'].includes(n.type));
  const personalNotifs = notifications.filter(n => ['approved', 'like', 'comment'].includes(n.type));
  const currentNotifs = activeNotifTab === 'system' ? systemNotifs : personalNotifs;

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.UID),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate("/");
  };

  const markAsRead = async (notif: Notification) => {
    if (!notif.read) {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
    }
    if (notif.link) {
      navigate(notif.link);
      setShowNotifDropdown(false);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'like': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'new_campaign': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'new_news': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Nav */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-pink-600">
                <Heart className="h-8 w-8 fill-current" />
                <span className="text-xl font-bold tracking-tight">Nuôi Em</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <NavLink to="/" className={({ isActive }) => `text-sm font-semibold py-5 transition-colors ${isActive ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}`}>Trang chủ</NavLink>
                <NavLink to="/du-an" className={({ isActive }) => `text-sm font-semibold py-5 transition-colors ${isActive ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}`}>Dự án</NavLink>
                <NavLink to="/to-chuc" className={({ isActive }) => `text-sm font-semibold py-5 transition-colors ${isActive ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}`}>Tổ chức</NavLink>
                <NavLink to="/minh-bach" className={({ isActive }) => `text-sm font-semibold py-5 transition-colors ${isActive ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}`}>Minh bạch</NavLink>
                <NavLink to="/cong-dong" className={({ isActive }) => `text-sm font-semibold py-5 transition-colors ${isActive ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}`}>Cộng đồng</NavLink>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {isAuthenticated && user && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="p-2 text-gray-500 hover:text-pink-600 transition-colors rounded-full hover:bg-pink-50 hidden sm:block relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 max-h-96 flex flex-col">
                      <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-gray-900">Thông báo</h3>
                        {unreadCount > 0 && <span className="text-xs text-pink-600 font-medium">{unreadCount} chưa đọc</span>}
                      </div>

                      <div className="flex border-b border-gray-100 shrink-0">
                        <button
                          onClick={() => setActiveNotifTab('system')}
                          className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${activeNotifTab === 'system' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Tin tức & Dự án
                        </button>
                        <button
                          onClick={() => setActiveNotifTab('personal')}
                          className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${activeNotifTab === 'personal' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Tương tác
                        </button>
                      </div>

                      <div className="overflow-y-auto flex-1">
                        {currentNotifs.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-500">
                            Chưa có thông báo nào.
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {currentNotifs.map(notif => (
                              <button
                                key={notif.id}
                                onClick={() => markAsRead(notif)}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${!notif.read ? 'bg-pink-50/30' : ''}`}
                              >
                                <div className="mt-1 shrink-0">
                                  {getNotifIcon(notif.type)}
                                </div>
                                <div>
                                  <p className={`text-sm ${!notif.read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: vi }) : ""}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && user?.role === 0 && (
                <Link to="/admin" className="hidden sm:flex items-center gap-2 bg-gray-900 text-white px-3 py-1.5 rounded-full font-medium text-sm hover:bg-gray-800 transition-colors">
                  Quản lý
                </Link>
              )}

              {isAuthenticated && user?.role === 1 && (
                <button
                  onClick={() => setShowOrgModal(true)}
                  className="hidden sm:flex items-center gap-2 bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full font-medium text-sm hover:bg-pink-200 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Đăng ký tổ chức
                </button>
              )}

              {isAuthenticated && user?.role === 2 && (
                <Link to="/organization" className="hidden sm:flex items-center gap-2 bg-pink-600 text-white px-3 py-1.5 rounded-full font-medium text-sm hover:bg-pink-700 transition-colors">
                  <Building2 className="w-4 h-4" />
                  Quản lý tổ chức
                </Link>
              )}

              {isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 bg-pink-50 text-pink-600 px-3 py-1.5 rounded-full font-medium text-sm hover:bg-pink-100 transition-colors"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullName} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-pink-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-pink-700" />
                      </div>
                    )}
                    {/* SỬA TẠI ĐÂY: user.name -> user.fullName */}
                    <span className="hidden sm:inline max-w-[100px] truncate">
                      {user.fullName || "Người dùng"}
                    </span>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        {/* SỬA TẠI ĐÂY: user.name -> user.fullName */}
                        <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/ho-so"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-pink-600"
                      >
                        Hồ sơ cá nhân
                      </Link>
                      <Link
                        to="/lich-su-quyen-gop"
                        onClick={() => setShowDropdown(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-pink-600"
                      >
                        Lịch sử quyên góp
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/dang-nhap" className="flex items-center gap-2 bg-pink-50 text-pink-600 px-4 py-2 rounded-full font-medium text-sm hover:bg-pink-100 transition-colors">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Link>
              )}

              <button className="md:hidden p-2 text-gray-500">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 text-pink-600 mb-4">
                <Heart className="h-6 w-6 fill-current" />
                <span className="text-lg font-bold tracking-tight">Nuôi Em</span>
              </Link>
              <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                Nền tảng quyên góp từ thiện trực tuyến, kết nối những tấm lòng vàng với các hoàn cảnh khó khăn trên khắp Việt Nam. Cùng nhau, chúng ta tạo nên những điều kỳ diệu.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Về chúng tôi</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><Link to="#" className="hover:text-pink-600 transition-colors">Giới thiệu</Link></li>
                <li><Link to="#" className="hover:text-pink-600 transition-colors">Quy chế hoạt động</Link></li>
                <li><Link to="#" className="hover:text-pink-600 transition-colors">Điều khoản sử dụng</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Hỗ trợ</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li><Link to="#" className="hover:text-pink-600 transition-colors">Trung tâm trợ giúp</Link></li>
                <li><Link to="#" className="hover:text-pink-600 transition-colors">Câu hỏi thường gặp</Link></li>
                <li><Link to="#" className="hover:text-pink-600 transition-colors">Liên hệ</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Nuôi Em. All rights reserved.
          </div>
        </div>
      </footer>

      <OrganizationRequestModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
      />
      <ChatWidget />
    </div>
  );
}