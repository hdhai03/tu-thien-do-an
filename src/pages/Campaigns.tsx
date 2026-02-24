import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Users, Clock, ShieldCheck, Search, ChevronDown, X } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import type { Campaign } from "../types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

// Thêm interface mở rộng cho UI
interface CampaignWithUI extends Campaign {
  daysLeft: number;
  organizationName: string;
  organizationLogo: string;
}

export default function Campaigns() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignWithUI[]>([]);

  // States cho bộ lọc
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState("Tất cả");
  const [expandedFilter, setExpandedFilter] = useState<"category" | "status" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = ["Y tế", "Giáo dục", "Trẻ em", "Cộng đồng"];
  const statuses = ["Tất cả", "Đang gây quỹ", "Đã kết thúc"];

  // 1. Fetch dữ liệu từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Lấy Organizations để map tên và logo
        const orgSnapshot = await getDocs(collection(db, "organizations"));
        const orgMap: Record<string, { name: string, logo: string }> = {};
        orgSnapshot.forEach(doc => {
          orgMap[doc.id] = { name: doc.data().name, logo: doc.data().logo };
        });

        // Lấy Campaigns
        const campaignSnapshot = await getDocs(collection(db, "campaigns"));
        const data = campaignSnapshot.docs
          .map(doc => {
            const item = doc.data() as Campaign;

            // Tính daysLeft an toàn
            const endDate = item.dateEnd?.toDate ? item.dateEnd.toDate() : new Date();
            const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return {
              ...item,
              id: doc.id,
              daysLeft: diff > 0 ? diff : 0,
              organizationName: orgMap[item.organizationId]?.name || "Tổ chức đang xác thực",
              organizationLogo: orgMap[item.organizationId]?.logo || ""
            };
          })
          .filter(item => item.status === 'approved' || !item.status) as CampaignWithUI[];

        setCampaigns(data);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleCategory = (category: string) => {
    setActiveCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // 2. Logic lọc tổng hợp (Sử dụng state campaigns đã fetch)
  const filteredCampaigns = campaigns.filter(c => {
    const matchCategory = activeCategories.length === 0 || activeCategories.includes(c.category);
    const matchStatus =
      activeStatus === "Tất cả" ? true :
        activeStatus === "Đang gây quỹ" ? c.daysLeft > 0 :
          c.daysLeft <= 0;
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());

    return matchCategory && matchStatus && matchSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-pink-900 mb-4">Các hoàn cảnh cần giúp đỡ</h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Hàng ngàn hoàn cảnh khó khăn đang chờ đợi sự chung tay của cộng đồng.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col mb-8">
          {/* Filter Tags */}
          {(activeCategories.length > 0 || activeStatus !== "Tất cả") && (
            <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-left-4 duration-300">
              {activeCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-900 text-white rounded-full text-sm font-medium hover:bg-pink-800 transition-colors"
                >
                  {cat} <X className="w-4 h-4" />
                </button>
              ))}
              {activeStatus !== "Tất cả" && (
                <button
                  onClick={() => setActiveStatus("Tất cả")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-800 text-white rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  {activeStatus} <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => { setActiveCategories([]); setActiveStatus("Tất cả"); }}
                className="text-sm text-gray-500 hover:text-pink-600 ml-2 font-medium"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center gap-8">
              <button
                onClick={() => setExpandedFilter(expandedFilter === "category" ? null : "category")}
                className={cn("flex items-center gap-2 font-bold text-sm transition-colors", (activeCategories.length > 0 || expandedFilter === "category") ? "text-pink-600" : "text-gray-600 hover:text-gray-900")}
              >
                Danh mục {activeCategories.length > 0 && `(${activeCategories.length})`}
                <ChevronDown className={cn("w-4 h-4 transition-transform", expandedFilter === "category" && "rotate-180")} />
              </button>

              <button
                onClick={() => setExpandedFilter(expandedFilter === "status" ? null : "status")}
                className={cn("flex items-center gap-2 font-bold text-sm transition-colors", (activeStatus !== "Tất cả" || expandedFilter === "status") ? "text-pink-600" : "text-gray-600 hover:text-gray-900")}
              >
                Trạng thái
                <ChevronDown className={cn("w-4 h-4 transition-transform", expandedFilter === "status" && "rotate-180")} />
              </button>
            </div>

            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm hoàn cảnh..."
                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 w-full md:w-64 transition-all"
              />
            </div>
          </div>

          {/* Expanded Filter Options */}
          <div className="min-h-[1rem]">
            {expandedFilter === "category" && (
              <div className="flex flex-wrap gap-2 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium transition-colors border",
                      activeCategories.includes(cat)
                        ? "bg-pink-900 text-white border-pink-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {expandedFilter === "status" && (
              <div className="flex flex-wrap gap-2 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setActiveStatus(status);
                      setExpandedFilter(null);
                    }}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium transition-colors border",
                      activeStatus === status
                        ? "bg-pink-900 text-white border-pink-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Campaign Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-full mb-6"></div>
                <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCampaigns.map((campaign) => {
              const progress = Math.min(100, (campaign.raised / campaign.goal) * 100);
              return (
                <Link to={`/du-an/${campaign.id}`} key={campaign.id} className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-pink-900/5 hover:-translate-y-1 transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={campaign.image || "https://via.placeholder.com/400x300"}
                      alt={campaign.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-sm">
                      {campaign.category}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-pink-600 transition-colors">
                      {campaign.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                      {campaign.organizationLogo ? (
                        <img src={campaign.organizationLogo} alt={campaign.organizationName} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                      )}
                      <span className="truncate">{campaign.organizationName}</span>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between text-sm font-medium mb-1.5">
                        <span className="text-pink-600">{formatCurrency(campaign.raised)}</span>
                        <span className="text-gray-500">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                        <div className="bg-pink-600 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[13px] text-gray-500 mb-5">
                        <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{campaign.donors}</span></div>
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>Còn {campaign.daysLeft} ngày</span></div>
                      </div>
                      <button className="w-full bg-pink-50 text-pink-600 text-sm font-bold py-2.5 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-colors">
                        Quyên góp
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Không tìm thấy hoàn cảnh nào</h3>
            <p className="text-gray-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
          </div>
        )}
      </div>
    </div>
  );
}