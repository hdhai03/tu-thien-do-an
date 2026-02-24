import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ChevronRight, Search, Filter } from "lucide-react";
import { cn } from "../lib/utils";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { NewsItem } from "../types";

export default function News() {
  const [loading, setLoading] = useState(true);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["Tất cả", "Hoạt động", "Dự án", "Báo cáo", "Sự kiện"];

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // Lấy dữ liệu sắp xếp theo ngày mới nhất
        const newsQuery = query(collection(db, "news"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(newsQuery);
        
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NewsItem[];

        setNewsList(data);
      } catch (error) {
        console.error("Lỗi khi tải tin tức:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Logic Lọc theo danh mục và Tìm kiếm
  const filteredNews = newsList.filter(news => {
    const matchesCategory = activeCategory === "Tất cả" || news.category === activeCategory;
    const matchesSearch = news.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          news.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Hàm hiển thị ngày tháng an toàn
  const formatDate = (date: any) => {
    if (!date) return "Đang cập nhật";
    const d = (date instanceof Timestamp) ? date.toDate() : new Date(date);
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tin tức cộng đồng</h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Cập nhật những thông tin mới nhất về các hoạt động, dự án thiện nguyện và báo cáo minh bạch.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-colors border",
                  activeCategory === cat 
                    ? "bg-pink-600 text-white border-pink-600" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm tin tức..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 w-full transition-all"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : filteredNews.length > 0 ? (
          <>
            {/* Tin nổi bật (Bài đầu tiên trong danh sách lọc) */}
            <div className="mb-12">
              <Link to={`/tin-tuc/${filteredNews[0].id}`} className="group flex flex-col md:flex-row bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
                  <img 
                    src={filteredNews[0].image} 
                    alt={filteredNews[0].title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold text-pink-600">
                    {filteredNews[0].category}
                  </div>
                </div>
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(filteredNews[0].date)}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 group-hover:text-pink-600 transition-colors">
                    {filteredNews[0].title}
                  </h2>
                  <p className="text-gray-600 mb-8 line-clamp-3 text-lg">
                    {filteredNews[0].summary}
                  </p>
                  <div className="mt-auto inline-flex items-center text-pink-600 font-bold">
                    Đọc toàn bộ bài viết <ChevronRight className="w-5 h-5 ml-1" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Danh sách các bài viết còn lại */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.slice(1).map((news) => (
                <Link to={`/tin-tuc/${news.id}`} key={news.id} className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative h-52 overflow-hidden">
                    <img 
                      src={news.image} 
                      alt={news.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-pink-600">
                      {news.category}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(news.date)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-pink-600 line-clamp-2">
                      {news.title}
                    </h3>
                    <p className="text-gray-600 mb-6 line-clamp-2 text-sm">
                      {news.summary}
                    </p>
                    <div className="mt-auto flex items-center text-pink-600 font-medium text-sm">
                      Đọc tiếp <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Không tìm thấy tin tức nào</h3>
            <p className="text-gray-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
          </div>
        )}
      </div>
    </div>
  );
}