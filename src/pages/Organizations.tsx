import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Heart, Target } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import type { Organization, Campaign } from "../types"; // Đảm bảo bạn có export type Campaign
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndCalculateData = async () => {
      try {
        setLoading(true);

        // 1. Lấy dữ liệu từ cả 2 collection cùng lúc
        const [orgSnapshot, campaignSnapshot] = await Promise.all([
          getDocs(collection(db, "organizations")),
          getDocs(collection(db, "campaigns"))
        ]);

        // Chuyển campaign snapshot thành mảng dữ liệu để duyệt
        const allCampaigns = campaignSnapshot.docs.map(doc => ({
          ...doc.data()
        })) as Campaign[];

        // 2. Duyệt qua từng tổ chức và tính toán số liệu thực tế từ collection campaigns
        const orgsData = orgSnapshot.docs.map((doc) => {
          const orgId = doc.id;
          const orgData = doc.data() as Organization;

          // Lọc các chiến dịch thuộc tổ chức này (so khớp qua organizationId)
          const relatedCampaigns = allCampaigns.filter(camp => camp.organizationId === orgId);

          return {
            ...orgData,
            id: orgId,
            // Cập nhật số liệu thực tế
            campaignCount: relatedCampaigns.length,
            totalRaised: relatedCampaigns.reduce((sum, camp) => sum + (camp.raised || 0), 0)
          };
        });

        setOrganizations(orgsData);
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAndCalculateData();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Các tổ chức đồng hành</h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Những tổ chức, quỹ từ thiện uy tín đã và đang cùng chúng tôi mang lại những điều tốt đẹp cho cộng đồng.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
                <div className="flex justify-between">
                  <div className="h-10 bg-gray-200 rounded-xl w-[48%]"></div>
                  <div className="h-10 bg-gray-200 rounded-xl w-[48%]"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div key={org.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:shadow-pink-900/5 transition-all duration-300 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={org.logo} 
                    alt={org.name} 
                    className="w-16 h-16 rounded-full object-cover border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                      {org.name}
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    </h3>
                    <p className="text-sm text-gray-500">Đối tác xác thực</p>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-6 flex-1 line-clamp-3">
                  {org.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-pink-50 rounded-xl p-3 text-center">
                    <div className="text-pink-600 text-sm mb-1 flex items-center justify-center gap-1 font-medium">
                      <Target className="w-4 h-4" /> Dự án
                    </div>
                    <div className="font-bold text-gray-900">{org.campaignCount}</div>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-3 text-center">
                    <div className="text-pink-600 text-sm mb-1 flex items-center justify-center gap-1 font-medium">
                      <Heart className="w-4 h-4" /> Đã gọi
                    </div>
                    <div className="font-bold text-gray-900 text-sm">{formatCurrency(org.totalRaised)}</div>
                  </div>
                </div>
                
                <Link 
                  to={`/hoan-canh?org=${org.id}`} 
                  className="w-full block text-center bg-white border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 hover:text-pink-600 hover:border-pink-200 transition-colors"
                >
                  Xem các dự án
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}