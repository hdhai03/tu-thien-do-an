import React, { useState } from "react";
import { X, Loader2, Building2, Upload, FileText } from "lucide-react";
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../lib/uploadImage";

interface OrganizationRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OrganizationRequestModal({ isOpen, onClose }: OrganizationRequestModalProps) {
    const { user } = useAuth();
    const [orgName, setOrgName] = useState("");
    const [description, setDescription] = useState("");
    const [logo, setLogo] = useState("");
    const [document, setDocument] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!logo) {
            setMessage({ type: "error", text: "Vui lòng tải lên ảnh logo tổ chức." });
            return;
        }

        if (!document) {
            setMessage({ type: "error", text: "Vui lòng tải lên giấy tờ chứng thực (PDF)." });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: "", text: "" });

        try {
            // Check if already requested
            const q = query(collection(db, "organization_requests"), where("userId", "==", user.UID), where("status", "==", "pending"));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setMessage({ type: "error", text: "Bạn đã gửi yêu cầu trước đó, vui lòng chờ duyệt." });
                setIsSubmitting(false);
                return;
            }

            await addDoc(collection(db, "organization_requests"), {
                userId: user.UID,
                organizationName: orgName,
                description: description,
                logo: logo,
                document: document,
                status: "pending",
                createdAt: Timestamp.now(),
            });

            setMessage({ type: "success", text: "Gửi yêu cầu thành công! Vui lòng chờ admin duyệt." });
            setTimeout(() => {
                onClose();
                setOrgName("");
                setDescription("");
                setLogo("");
                setDocument("");
                setMessage({ type: "", text: "" });
            }, 2000);
        } catch (error) {
            console.error("Lỗi gửi yêu cầu:", error);
            setMessage({ type: "error", text: "Có lỗi xảy ra, vui lòng thử lại." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-pink-600" />
                        Đăng ký tổ chức
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {message.text && (
                        <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Tên tổ chức</label>
                            <input
                                type="text"
                                required
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                placeholder="Nhập tên tổ chức..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Ảnh logo</label>
                            <div className="flex items-center gap-4">
                                {logo && (
                                    <img src={logo} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                                )}
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
                                                    setIsSubmitting(true);
                                                    const url = await uploadImage(file);
                                                    setLogo(url);
                                                } catch (error) {
                                                    alert("Lỗi upload ảnh");
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Giấy tờ chứng thực (PDF)</label>
                            <div className="flex items-center gap-4">
                                {document && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-pink-50 text-pink-700 rounded-xl border border-pink-100">
                                        <FileText className="w-5 h-5" />
                                        <span className="text-sm font-medium truncate max-w-[150px]">Đã tải lên</span>
                                    </div>
                                )}
                                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                    <Upload className="w-5 h-5 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">Chọn file PDF</span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.type !== "application/pdf") {
                                                    alert("Vui lòng chọn file định dạng PDF");
                                                    return;
                                                }
                                                try {
                                                    setIsSubmitting(true);
                                                    const url = await uploadImage(file);
                                                    setDocument(url);
                                                } catch (error) {
                                                    alert("Lỗi upload file");
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">Tải lên giấy phép hoạt động hoặc quyết định thành lập tổ chức.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Mô tả hoạt động</label>
                            <textarea
                                required
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all resize-none"
                                placeholder="Mô tả ngắn gọn về tổ chức và mục đích quyên góp..."
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !orgName.trim() || !description.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-pink-700 transition-colors disabled:opacity-70"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Gửi yêu cầu"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
