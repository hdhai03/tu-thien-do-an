import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
// Thêm các Provider từ Firebase
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation cơ bản trước khi gửi lên Firebase
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự (quy định của Firebase)");
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password);
      navigate("/");
    } catch (err: any) {
      // Việt hóa lỗi từ Firebase
      if (err.message.includes("auth/email-already-in-use")) {
        setError("Email này đã được sử dụng bởi một tài khoản khác");
      } else if (err.message.includes("auth/invalid-email")) {
        setError("Định dạng email không hợp lệ");
      } else if (err.message.includes("auth/weak-password")) {
        setError("Mật khẩu quá yếu");
      } else {
        setError("Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng ký/Đăng nhập nhanh bằng MXH
  const handleSocialRegister = async () => {
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      // Firebase sẽ tự động tạo tài khoản nếu email chưa tồn tại
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err: any) {
      setError("Không thể kết nối với mạng xã hội");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-pink-900/5 border border-gray-100">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-50 text-pink-600 mb-6">
            <Heart className="w-8 h-8 fill-current" />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Tạo tài khoản mới</h2>
          <p className="text-gray-500">Cùng nhau lan tỏa yêu thương đến cộng đồng</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors text-gray-900 placeholder-gray-400"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors text-gray-900 placeholder-gray-400"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Mật khẩu tối thiểu 6 ký tự.</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-gray-600">
                Tôi đồng ý với các{" "}
                <a href="#" className="font-medium text-pink-600 hover:text-pink-500">Điều khoản</a>{" "}
                và{" "}
                <a href="#" className="font-medium text-pink-600 hover:text-pink-500">Bảo mật</a>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors shadow-lg shadow-pink-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Đăng ký ngay
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc đăng ký nhanh qua</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => handleSocialRegister()}
              className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <img className="h-5 w-5" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              <span className="ml-2">Google</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Link to="/dang-nhap" className="font-bold text-pink-600 hover:text-pink-500">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}