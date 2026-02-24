import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Heart, Users, Clock, ChevronRight, ShieldCheck, TrendingUp, CheckCircle2, Building2 } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import type { Campaign } from "../types";
import type { NewsItem } from "../types";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<(Campaign & { daysLeft: number })[]>([]);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, { name: string, logo: string }>>({});
  const [stats, setStats] = useState({
    totalRaised: 0,
    totalDonors: 0,
    completedCampaigns: 0,
    totalOrganizations: 0,
  });

  const calculateDaysLeft = (dateEnd: any) => {
    if (!dateEnd) return 0;
    const end = (dateEnd instanceof Timestamp) ? dateEnd.toDate() : new Date(dateEnd);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const orgSnapshot = await getDocs(collection(db, "organizations"));
        const orgData: Record<string, { name: string, logo: string }> = {};
        orgSnapshot.forEach((doc) => {
          orgData[doc.id] = { name: doc.data().name, logo: doc.data().logo };
        });
        setOrgMap(orgData);
        const totalOrganizations = orgSnapshot.size;

        const newsSnapshot = await getDocs(collection(db, "news"));
        const newsData = newsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NewsItem[];
        setNewsList(newsData);

        const campaignSnapshot = await getDocs(collection(db, "campaigns"));
        let totalRaised = 0;
        let totalDonors = 0;
        let completedCampaigns = 0;

        const campaignList = campaignSnapshot.docs.map((doc) => {
          const data = doc.data() as Campaign;

          totalRaised += data.raised || 0;
          totalDonors += data.donors || 0;
          if ((data.raised || 0) >= (data.goal || 1)) {
            completedCampaigns++;
          }

          return {
            ...data,
            id: doc.id,
            daysLeft: calculateDaysLeft(data.dateEnd),
          };
        });
        setCampaigns(campaignList);

        setStats({
          totalRaised,
          totalDonors,
          completedCampaigns,
          totalOrganizations,
        });

      } catch (error) {
        console.error("Error fetching data from Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="pb-12 bg-gray-50/30">

      {/* Hero Banner - FULL MÀN HÌNH & CĂN GIỮA TOÀN BỘ */}
      <section className="relative min-h-screen flex items-center justify-center bg-pink-600 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {/* Vòng sáng nằm giữa màn hình */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[url('https://res.cloudinary.com/dh23ny0t8/image/upload/v1771836156/W9nA9AQxEi7qySiuZiyCqa6zvYQ_ocsgtg.avif?blur=2')] bg-cover bg-center mix-blend-overlay"></div>
        </div>

        {/* Container nội dung: Đã thêm flex-col và items-center */}
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl flex flex-col items-center text-center"
          >
            {/* Badge căn giữa */}
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 text-sm font-semibold mb-8 backdrop-blur-sm border border-white/30">
              <Heart className="h-4 w-4 fill-current" />
              Cùng nhau làm việc tốt
            </span>

            {/* Text Title căn giữa */}
            <h1 className="text-5xl md:text-6xl lg:text-[5.5rem] font-bold tracking-[0.01em] mb-8 leading-[1.15]">
              Vì một Việt Nam <br /> tốt đẹp hơn!
            </h1>

            {/* Đoạn văn mô tả (Subtitle) căn giữa bằng mx-auto */}
            <p className="text-lg md:text-1xl text-pink-100 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Nền tảng quyên góp minh bạch, an toàn và dễ dàng. Hãy cùng chúng tôi mang lại nụ cười cho những hoàn cảnh khó khăn.
            </p>

            {/* Nút bấm (Buttons) dùng justify-center để đứng vào giữa */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
              <Link
                to="/du-an"
                className="bg-white text-pink-700 px-10 py-4 rounded-full font-bold 
             hover:bg-pink-700 hover:text-white 
             transition-colors shadow-lg text-lg 
             w-full sm:w-auto"
              >
                Quyên góp ngay
              </Link>
              <Link to="/minh-bach" className="bg-pink-700/50 text-white px-10 py-4 rounded-full font-bold hover:bg-pink-700 transition-colors backdrop-blur-sm border border-pink-500/30 text-lg w-full sm:w-auto">
                Tìm hiểu thêm
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - FLAT & DASHBOARD HEAVY STYLE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            {
              label: "Tổng tiền quyên góp",
              value: new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalRaised),
              icon: TrendingUp,
              iconColor: "text-pink-600",
              bgColor: "bg-pink-100",
              borderColor: "border-pink-200",
            },
            {
              label: "Lượt người tham gia",
              value: new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(stats.totalDonors),
              icon: Users,
              iconColor: "text-pink-600",
              bgColor: "bg-pink-100",
              borderColor: "border-pink-200",
            },
            {
              label: "Dự án hoàn thành",
              value: stats.completedCampaigns.toLocaleString('vi-VN'),
              icon: CheckCircle2,
              iconColor: "text-pink-600",
              bgColor: "bg-pink-100",
              borderColor: "border-pink-200",
            },
            {
              label: "Tổ chức đồng hành",
              value: stats.totalOrganizations.toLocaleString('vi-VN'),
              icon: Building2,
              iconColor: "text-pink-600",
              bgColor: "bg-pink-100",
              borderColor: "border-pink-200",
            },
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              key={i}
              className="bg-white border-2 border-pink-50 rounded-2xl p-6 hover:border-pink-50 transition-colors flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-8">
                <div className={`w-14 h-14 flex items-center justify-center rounded-xl border-2 ${stat.borderColor} ${stat.bgColor}`}>
                  <stat.icon className={`w-7 h-7 ${stat.iconColor}`} />
                </div>
              </div>

              <div className="mt-auto">
                <h3 className="text-4xl font-black text-gray-900 mb-1">{stat.value}</h3>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-6">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Campaigns List */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Các hoàn cảnh cần giúp đỡ</h2>
          <Link to="/du-an" className="text-pink-600 font-bold hover:text-pink-700 flex items-center gap-1 bg-pink-50 px-4 py-2 rounded-full transition-colors">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-96 bg-gray-100 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const progress = Math.min(100, (campaign.raised / campaign.goal) * 100);
              const org = orgMap[campaign.organizationId] || { name: "Tổ chức đang xác thực", logo: "" };

              return (
                <Link to={`/campaign/${campaign.id}`} key={campaign.id} className="group bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-gray-300 transition-all flex flex-col h-full">
                  <div className="relative h-52 overflow-hidden bg-gray-100">
                    <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">{campaign.title}</h3>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500">
                      {org.logo ? <img src={org.logo} className="w-5 h-5 rounded-full object-cover" /> : <ShieldCheck className="w-4 h-4 text-green-500" />}
                      <span className="truncate">{org.name}</span>
                    </div>

                    <div className="mt-auto">
                      <div className="w-full bg-gray-100 h-2 rounded-full mb-3">
                        <div className="bg-pink-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-sm mb-5">
                        <div>
                          <span className="block text-[10px] text-gray-400 font-bold uppercase mb-0.5">Đã quyên góp</span>
                          <span className="font-bold text-pink-600 text-base">{formatCurrency(campaign.raised)}</span>
                        </div>
                        <span className="text-gray-500 font-semibold bg-gray-50 px-2 py-1 rounded-md text-xs">Còn {campaign.daysLeft} ngày</span>
                      </div>
                      <div className="w-full bg-gray-50 border-2 border-gray-100 text-gray-700 font-bold py-3 rounded-xl text-center group-hover:bg-pink-600 group-hover:border-pink-600 group-hover:text-white transition-colors">
                        Quyên góp
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Community News */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tin tức cộng đồng</h2>
            <p className="text-gray-500 font-medium mt-1">Cập nhật các hoạt động mới nhất từ quỹ</p>
          </div>
          <Link to="/tin-tuc" className="hidden sm:inline-flex items-center gap-1 text-pink-600 font-bold hover:text-pink-700 transition-colors bg-pink-50 px-4 py-2 rounded-full">
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {!loading && newsList.map((news) => {
            const dateObj = (news.date instanceof Timestamp) ? news.date.toDate() : new Date(news.date);
            const displayDate = dateObj.toLocaleDateString('vi-VN');

            return (
              <Link to={`/tin-tuc/${news.id}`} key={news.id} className="group bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-gray-300 transition-all flex flex-col h-full">
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img src={news.image} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-pink-600 border border-gray-100">
                    {news.category}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-3 uppercase">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{displayDate}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-pink-600 transition-colors text-lg">
                    {news.title}
                  </h3>
                  <div className="mt-auto flex items-center text-pink-600 font-black text-sm uppercase tracking-wide">
                    Đọc tiếp <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/tin-tuc" className="inline-flex items-center justify-center gap-2 bg-gray-50 border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors w-full">
            Xem tất cả tin tức <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}