import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, ChevronLeft, Facebook, Twitter, Link as LinkIcon, AlertCircle } from "lucide-react";
import { doc, getDoc, collection, query, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

interface NewsItem {
  id: string;
  title: string;
  category: string;
  image: string;
  author: string;
  date: Timestamp;
  content: string;
  summary: string;
}

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticleData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // 1. Lấy chi tiết bài viết hiện tại
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const currentData = { id: docSnap.id, ...docSnap.data() } as NewsItem;
          setArticle(currentData);

          // 2. Lấy tin liên quan (cùng category, tối đa 2 bài, loại trừ bài hiện tại)
          const relatedQuery = query(
            collection(db, "news"),
            where("category", "==", currentData.category),
            limit(3)
          );
          const relatedSnap = await getDocs(relatedQuery);
          const relatedData = relatedSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as NewsItem))
            .filter(item => item.id !== id)
            .slice(0, 2);
          
          setRelatedNews(relatedData);
        }
      } catch (error) {
        console.error("Lỗi khi tải chi tiết tin tức:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
    // Cuộn lên đầu trang khi đổi id bài viết
    window.scrollTo(0, 0);
  }, [id]);

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = (date instanceof Timestamp) ? date.toDate() : new Date(date);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy bài viết</h2>
        <p className="text-gray-500 mb-8">Bài viết có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Link to="/tin-tuc" className="bg-pink-600 text-white px-6 py-2.5 rounded-full font-bold">
          Quay lại danh sách tin tức
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Article Header */}
      <div className="bg-white border-b border-gray-200 pt-8 pb-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link to="/tin-tuc" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-pink-600 mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Quay lại danh sách tin tức
          </Link>
          
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold uppercase tracking-wider">
              {article.category}
            </span>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1.5" />
              {formatDate(article.date)}
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex items-center justify-between py-6 border-t border-gray-100 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                {article.author?.charAt(0) || "A"}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{article.author || "Ban Truyền Thông"}</div>
                <div className="text-xs text-gray-500">Tác giả</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 mr-2 hidden sm:inline-block">Chia sẻ:</span>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <Facebook className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-sky-50 hover:text-sky-500 transition-all">
                <Twitter className="w-4 h-4" />
              </button>
              <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all">
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="w-full aspect-video relative">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="p-8 md:p-12 lg:p-16">
            {/* Render HTML Content từ Firebase */}
            <div 
              className="prose prose-lg prose-pink max-w-none text-gray-700 leading-relaxed
                prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mt-10 prose-headings:mb-6
                prose-h3:text-2xl
                prose-p:mb-6
                prose-img:rounded-2xl prose-img:my-10 prose-img:w-full prose-img:object-cover
                prose-blockquote:border-l-4 prose-blockquote:border-pink-500 prose-blockquote:bg-pink-50 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:text-pink-900 prose-blockquote:font-medium prose-blockquote:italic prose-blockquote:my-8"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </div>
        
        {/* Related News Section */}
        {relatedNews.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Tin tức liên quan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedNews.map((item) => (
                <Link to={`/tin-tuc/${item.id}`} key={item.id} className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-6">
                    <h4 className="font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="text-sm text-gray-500">{formatDate(item.date)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}