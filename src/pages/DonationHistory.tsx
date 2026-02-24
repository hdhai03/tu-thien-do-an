import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { History, Search, Loader2 } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Donation } from "../types";

interface EnrichedDonation extends Donation {
  id: string;
  campaignName: string;
}

export default function DonationHistory() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<EnrichedDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUserDonations = async () => {
      if (!user?.UID) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Lấy danh sách donations của user
        const donationRef = collection(db, "donations");
        const q = query(
          donationRef,
          where("userId", "==", user.UID),
          orderBy("donationDate", "desc")
        );

        const querySnapshot = await getDocs(q);
        const rawDonations = querySnapshot.docs.map(d => ({ 
          ...(d.data() as Donation), 
          id: d.id 
        }));

        // 2. TỐI ƯU: Lấy danh sách campaignId duy nhất để tránh query trùng lặp
        const campaignIds = Array.from(new Set(rawDonations.map(d => d.campaignId).filter(Boolean)));
        
        // Tạo một Map để lưu trữ thông tin campaign { id: title }
        const campaignMap: Record<string, string> = {};

        // Lấy thông tin các chiến dịch (Nên dùng bộ lọc in hoặc fetch song song nhưng có kiểm soát)
        await Promise.all(
          campaignIds.map(async (id) => {
            const cDoc = await getDoc(doc(db, "campaigns", id));
            if (cDoc.exists()) {
              campaignMap[id] = cDoc.data().title;
            }
          })
        );

        // 3. Trộn dữ liệu
        const enrichedData: EnrichedDonation[] = rawDonations.map(d => ({
          ...d,
          campaignName: campaignMap[d.campaignId] || "Chiến dịch không tồn tại hoặc đã ẩn"
        }));

        setDonations(enrichedData);
      } catch (error) {
        console.error("Lỗi khi lấy lịch sử quyên góp:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDonations();
  }, [user?.UID]); // Chỉ chạy lại khi UID thực sự thay đổi

  const filteredDonations = donations.filter((d) =>
    d.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <History className="w-8 h-8" />
        </div>
        <p className="text-gray-500 font-medium">Vui lòng đăng nhập để xem lịch sử quyên góp.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-pink-600">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lịch sử quyên góp</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Chào <span className="font-semibold text-gray-700">{user.fullName || "bạn"}</span>, đây là các khoản đóng góp của bạn
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm chiến dịch..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 w-full sm:w-64 transition-all"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                <p className="animate-pulse">Đang tải lịch sử...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 font-semibold text-gray-900 text-sm">Tên quỹ</th>
                    <th className="py-4 px-6 font-semibold text-gray-900 text-sm text-right sm:text-left">Số tiền</th>
                    <th className="py-4 px-6 font-semibold text-gray-900 text-sm hidden md:table-cell">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDonations.map((donation) => {
                    const dateObj = donation.donationDate?.toDate?.() || null;
                    return (
                      <tr key={donation.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 line-clamp-1">{donation.campaignName}</span>
                            {dateObj && (
                              <span className="text-[10px] text-gray-400 md:hidden mt-1">
                                {dateObj.toLocaleString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right sm:text-left">
                          <span className="font-bold text-pink-600">
                            {formatCurrency(donation.amount)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 text-sm hidden md:table-cell">
                          {dateObj ? dateObj.toLocaleString('vi-VN', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          }) : "---"}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredDonations.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-gray-400 italic">
                        {searchQuery ? "Không tìm thấy kết quả phù hợp." : "Bạn chưa có giao dịch quyên góp nào."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}