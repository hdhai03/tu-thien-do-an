import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Phone, Lock, Camera, Save, Shield, Loader2, Upload } from "lucide-react";
import { uploadImage } from "../lib/uploadImage";
import { doc, setDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "../lib/firebase";

export default function Profile() {
  const { user, updateUser } = useAuth(); // Giả định updateUser trong context cập nhật lại state cục bộ

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: 1,
    avatar: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Đồng bộ dữ liệu từ context vào form khi user load xong
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        gender: user.gender ?? 1,
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "gender" ? parseInt(value) : value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // 1. CẬP NHẬT HỒ SƠ LÊN FIRESTORE
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.UID) return;

    try {
      setLoading(true);

      // Tham chiếu đến document. 
      // LƯU Ý: Nếu bạn muốn dùng UID làm ID document (khuyên dùng), hãy đảm bảo lúc tạo user bạn đã làm vậy.
      const userRef = doc(db, "users", user.UID);

      const dataToSave = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        avatar: formData.avatar,
        UID: user.UID, // Lưu lại UID vào field để đồng bộ như trong hình của bạn
        email: formData.email
      };

      // setDoc với { merge: true } sẽ tạo mới nếu thiếu hoặc cập nhật nếu đã có
      await setDoc(userRef, dataToSave, { merge: true });

      if (updateUser) updateUser(dataToSave);

      setIsEditing(false);
      setMessage({ type: "success", text: "Cập nhật hồ sơ thành công!" });
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      setMessage({ type: "error", text: "Không thể cập nhật hồ sơ. Vui lòng thử lại." });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  // 2. ĐỔI MẬT KHẨU (Yêu cầu Re-authentication)
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;

    if (!currentUser || !currentUser.email) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu mới không khớp!" });
      return;
    }

    try {
      setLoading(true);
      // Bước 1: Xác thực lại mật khẩu cũ (Bắt buộc của Firebase khi đổi pass)
      const credential = EmailAuthProvider.credential(currentUser.email, passwordData.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Bước 2: Cập nhật mật khẩu mới
      await updatePassword(currentUser, passwordData.newPassword);

      setIsChangingPassword(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.code === 'auth/wrong-password' ? "Mật khẩu hiện tại không đúng." : "Lỗi bảo mật, vui lòng thử lại.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  if (!user) return <div className="text-center py-20 italic text-gray-500">Vui lòng đăng nhập để xem hồ sơ.</div>;

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="bg-pink-600 px-8 py-12 text-center relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  setIsChangingPassword(false);
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors backdrop-blur-sm"
              >
                {isEditing ? "Hủy" : "Chỉnh sửa"}
              </button>
            </div>

            <div className="relative inline-block mb-4">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt={formData.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg text-gray-400">
                  <User size={48} />
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{formData.fullName || "Người dùng"}</h1>
            <p className="text-pink-100 mt-1">{formData.email}</p>
          </div>

          {message.text && (
            <div className={`mx-8 mt-8 p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {message.text}
            </div>
          )}

          <div className="p-8">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Họ và tên */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" /> Họ và tên
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 disabled:opacity-70 transition-all"
                  />
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" /> Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Số điện thoại */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" /> Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 disabled:opacity-70 transition-all"
                  />
                </div>

                {/* Giới tính */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" /> Giới tính
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 disabled:opacity-70 transition-all"
                  >
                    <option value={1}>Nam</option>
                    <option value={0}>Nữ</option>
                    <option value={2}>Khác</option>
                  </select>
                </div>

                {isEditing && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-400" /> Ảnh đại diện
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <Upload className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Chọn ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setLoading(true);
                                const url = await uploadImage(file);
                                setFormData({ ...formData, avatar: url });
                              } catch (error) {
                                alert("Lỗi upload ảnh");
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-pink-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-pink-700 transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu thay đổi
                  </button>
                </div>
              )}
            </form>

            <hr className="my-8 border-gray-100" />

            {/* Bảo mật */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" /> Bảo mật
                </h3>
                {!isChangingPassword && (
                  <button
                    onClick={() => {
                      setIsChangingPassword(true);
                      setIsEditing(false);
                    }}
                    className="text-pink-600 text-sm font-medium hover:text-pink-700"
                  >
                    Đổi mật khẩu
                  </button>
                )}
              </div>

              {isChangingPassword && (
                <form onSubmit={handleSavePassword} className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      name="currentPassword"
                      required
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Mật khẩu mới</label>
                      <input
                        type="password"
                        name="newPassword"
                        required
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-pink-900 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Cập nhật mật khẩu
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}