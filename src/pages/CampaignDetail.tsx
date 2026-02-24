import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Heart, Users, Clock, ShieldCheck, ChevronRight,
  Trophy, History, User, Search, ChevronLeft, X, AlertCircle, Loader2
} from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import type { Campaign } from "../types";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAuth } from "firebase/auth";

interface DonationData {
  id: string;
  userId: string;
  amount: number;
  donationDate: Timestamp; // Sử dụng thống nhất tên này
  isAnonymous: boolean;
  fullname?: string;
  avatar?: string;
}

interface CampaignDetailData extends Campaign {
  daysLeft: number;
  organizationName: string;
  organizationLogo?: string;
}

export default function CampaignDetail() {
  const { id } = useParams();
  const auth = getAuth();
  const [campaign, setCampaign] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [donationForm, setDonationForm] = useState({
    name: "",
    phone: "",
    email: "",
    amount: "",
    isAnonymous: false
  });

  const [recentDonations, setRecentDonations] = useState<DonationData[]>([]);
  const [topDonations, setTopDonations] = useState<DonationData[]>([]);

  // 1. Hàm làm giàu dữ liệu (Lấy thêm avatar/tên thật từ collection users)
  const enrichDonationsWithUserInfo = async (donations: any[]) => {
    return await Promise.all(
      donations.map(async (donation) => {
        // Ưu tiên hiển thị "Ẩn danh" nếu khách chọn
        if (donation.isAnonymous) {
          return { ...donation, fullname: "Nhà hảo tâm ẩn danh", avatar: undefined };
        }

        // Nếu có userId, thử tìm thông tin trong bảng users
        if (donation.userId && donation.userId !== "") {
          try {
            const userDoc = await getDoc(doc(db, "users", donation.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...donation,
                fullname: userData.fullName || donation.fullname || "Nhà hảo tâm",
                avatar: userData.avatar
              };
            }
          } catch (err) {
            console.error("Lỗi lấy thông tin user:", donation.userId);
          }
        }

        // Mặc định trả về tên đã lưu lúc quyên góp (từ webhook)
        return { ...donation, fullname: donation.fullname || "Nhà hảo tâm" };
      })
    );
  };

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        // A. Lấy thông tin chiến dịch
        const docRef = doc(db, "campaigns", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Không tìm thấy chiến dịch này.");
          return;
        }

        const campaignData = docSnap.data() as Campaign;

        // Tính ngày còn lại
        const endDate = campaignData.dateEnd?.toDate ? campaignData.dateEnd.toDate() : new Date();
        const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // Lấy thông tin tổ chức
        let orgName = "Tổ chức đang xác thực";
        let orgLogo = "";
        if (campaignData.organizationId) {
          const orgSnap = await getDoc(doc(db, "organizations", campaignData.organizationId));
          if (orgSnap.exists()) {
            orgName = orgSnap.data().name;
            orgLogo = orgSnap.data().logo || "";
          }
        }

        setCampaign({
          ...campaignData,
          id: docSnap.id,
          daysLeft: diff > 0 ? diff : 0,
          organizationName: orgName,
          organizationLogo: orgLogo
        } as CampaignDetailData);

        // B. Lấy danh sách quyên góp (Sử dụng donationDate)
        const donationColl = collection(db, "donations");

        // Query 1: Quyên góp mới nhất
        const recentQ = query(
          donationColl,
          where("campaignId", "==", id),
          orderBy("donationDate", "desc"), // ĐÃ ĐỒNG BỘ
          limit(15)
        );

        // Fetch all donations for the campaign to calculate top donors
        const allDonationsQ = query(
          donationColl,
          where("campaignId", "==", id)
        );

        const [recentSnap, allDonationsSnap] = await Promise.all([getDocs(recentQ), getDocs(allDonationsQ)]);

        const rawRecent = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allDonations = allDonationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        // Group by userId for top donations
        const userTotals: Record<string, any> = {};
        const anonymousDonations: any[] = [];

        allDonations.forEach(donation => {
          if (donation.userId && !donation.isAnonymous) {
            if (!userTotals[donation.userId]) {
              userTotals[donation.userId] = {
                ...donation,
                amount: 0,
              };
            }
            userTotals[donation.userId].amount += donation.amount;
            userTotals[donation.userId].isAnonymous = false;
            userTotals[donation.userId].fullname = donation.fullname;
          } else {
            anonymousDonations.push(donation);
          }
        });

        const groupedDonations = [...Object.values(userTotals), ...anonymousDonations];
        groupedDonations.sort((a, b) => b.amount - a.amount);
        const rawTop = groupedDonations.slice(0, 3);

        const [enrichedRecent, enrichedTop] = await Promise.all([
          enrichDonationsWithUserInfo(rawRecent),
          enrichDonationsWithUserInfo(rawTop)
        ]);

        setRecentDonations(enrichedRecent as DonationData[]);
        setTopDonations(enrichedTop as DonationData[]);

      } catch (err: any) {
        console.error("Lỗi fetch:", err);
        if (err.message?.includes("index")) {
          setError("Hệ thống đang khởi tạo dữ liệu (thiếu Index). Vui lòng đợi vài phút.");
        } else {
          setError("Đã có lỗi xảy ra khi tải dữ liệu.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  // Hàm xử lý thanh toán PayOS
  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const paymentData = {
        amount: Number(donationForm.amount),
        campaignId: id,
        customerName: donationForm.isAnonymous ? "Nhà hảo tâm ẩn danh" : donationForm.name,
        customerPhone: donationForm.phone,
        customerEmail: donationForm.email,
        isAnonymous: donationForm.isAnonymous,
        userId: auth.currentUser?.uid || null,
      };

      const response = await fetch("https://adaline-prospectless-barb.ngrok-free.dev/api/payment/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert("Lỗi: " + (data.message || "Không thể tạo link"));
      }
    } catch (err) {
      alert("Lỗi kết nối đến máy chủ thanh toán!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-600"></div>
    </div>
  );

  if (error || !campaign) return (
    <div className="text-center py-20 px-4">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold">{error || "Không tìm thấy chiến dịch"}</h2>
      <Link to="/" className="text-pink-600 mt-4 inline-block underline">Quay lại trang chủ</Link>
    </div>
  );

  const progress = Math.min(100, (campaign.raised / campaign.goal) * 100);
  const campaignImages = [campaign.image, ...(campaign.storyImages || [])];
  const filteredDonors = recentDonations.filter(d =>
    (d.fullname || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-50 pb-20">
      {/* Header Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-pink-600">Trang chủ</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 truncate font-medium">{campaign.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CỘT TRÁI: THÔNG TIN CHIẾN DỊCH */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {/* Slider ảnh */}
              <div className="relative h-[300px] md:h-[450px] group bg-gray-100">
                <img
                  src={campaignImages[currentImageIndex]}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {campaignImages.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setCurrentImageIndex((p) => (p - 1 + campaignImages.length) % campaignImages.length)} className="w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"><ChevronLeft /></button>
                    <button onClick={() => setCurrentImageIndex((p) => (p + 1) % campaignImages.length)} className="w-10 h-10 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"><ChevronRight /></button>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4 inline-block">{campaign.category}</span>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">{campaign.title}</h1>

                <div className="flex items-center gap-4 py-4 border-y border-gray-100 mb-8">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 shrink-0 overflow-hidden">
                    {campaign.organizationLogo ? (
                      <img src={campaign.organizationLogo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShieldCheck className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-semibold">Tổ chức minh bạch</div>
                    <div className="font-bold text-gray-900">{campaign.organizationName}</div>
                  </div>
                </div>

                <div className="prose prose-pink max-w-none text-gray-600 mb-12 whitespace-pre-line">
                  {campaign.description}
                </div>

                {/* DANH SÁCH ỦNG HỘ */}
                <div className="pt-8 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-pink-600" />
                      <h3 className="text-xl font-bold text-gray-900">Danh sách ủng hộ</h3>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm tên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm w-full sm:w-56"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredDonors.length > 0 ? (
                      filteredDonors.map((donor) => (
                        <div key={donor.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-50 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center shrink-0 overflow-hidden">
                            {donor.avatar && !donor.isAnonymous ? (
                              <img src={donor.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="text-pink-300 w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{donor.fullname}</h4>
                            <span className="text-xs text-gray-400">
                              {/* HIỂN THỊ donationDate */}
                              {donor.donationDate?.toDate
                                ? donor.donationDate.toDate().toLocaleDateString('vi-VN')
                                : "Vừa xong"}
                            </span>
                          </div>
                          <div className="font-bold text-pink-600">
                            {formatCurrency(Number(donor.amount))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                        Chưa có lượt ủng hộ nào hiển thị.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: WIDGET QUYÊN GÓP */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24 space-y-6">
              <div>
                <div className="text-3xl font-black text-pink-600">{formatCurrency(campaign.raised)}</div>
                <div className="flex justify-between text-sm mt-2 mb-2 text-gray-500">
                  <span>Mục tiêu: <b className="text-gray-900">{formatCurrency(campaign.goal)}</b></span>
                  <span className="font-bold text-pink-600">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-pink-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900">{campaign.donors}</div>
                  <div className="text-xs text-gray-500 font-medium">Lượt QG</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-gray-900">{campaign.daysLeft}</div>
                  <div className="text-xs text-gray-500 font-medium">Ngày còn</div>
                </div>
              </div>

              <button
                onClick={() => setIsDonationModalOpen(true)}
                className="w-full bg-pink-600 text-white font-bold py-4 rounded-2xl hover:bg-pink-700 transition-all shadow-lg shadow-pink-100 flex items-center justify-center gap-2"
              >
                <Heart className="w-5 h-5 fill-current" /> QUYÊN GÓP NGAY
              </button>

              {/* TOP NHÀ HẢO TÂM */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-gray-900">Top nhà hảo tâm</h3>
                </div>
                <div className="space-y-4">
                  {topDonations.length > 0 ? topDonations.map((donor, index) => (
                    <div key={donor.id} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                          {donor.avatar && !donor.isAnonymous ? (
                            <img src={donor.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div className={cn(
                          "absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center",
                          index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-400" : "bg-orange-400"
                        )}>{index + 1}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900 truncate">{donor.fullname}</div>
                        <div className="text-xs font-bold text-pink-600">{formatCurrency(Number(donor.amount))}</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400 text-center italic">Đang cập nhật...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL QUYÊN GÓP (Giữ nguyên form của bạn) */}
      {isDonationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Quyên góp</h3>
              <button onClick={() => !isSubmitting && setIsDonationModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleDonationSubmit} className="p-6 space-y-4">
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAnonymous"
                  checked={donationForm.isAnonymous}
                  onChange={(e) => {
                    setDonationForm({
                      ...donationForm,
                      isAnonymous: e.target.checked,
                      name: e.target.checked ? "" : donationForm.name
                    });
                  }}
                  className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                />
                <label htmlFor="isAnonymous" className="text-sm text-gray-700 cursor-pointer">
                  Tôi muốn quyên góp ẩn danh
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required={!donationForm.isAnonymous}
                  disabled={donationForm.isAnonymous}
                  value={donationForm.name}
                  onChange={(e) => setDonationForm({ ...donationForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all disabled:opacity-50"
                  placeholder={donationForm.isAnonymous ? "Ẩn danh" : "Nhập họ và tên"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={donationForm.phone}
                  onChange={(e) => setDonationForm({ ...donationForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={donationForm.email}
                  onChange={(e) => setDonationForm({ ...donationForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                  placeholder="Nhập địa chỉ email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền quyên góp (VNĐ)</label>
                <input
                  type="number"
                  min="10000"
                  required
                  value={donationForm.amount}
                  onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-pink-600"
                  placeholder="VD: 100000"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-pink-600 text-white font-bold py-3.5 rounded-xl hover:bg-pink-700 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Xác nhận quyên góp"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}