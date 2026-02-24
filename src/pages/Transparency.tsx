import { ShieldCheck, Users, Newspaper, Award, ExternalLink } from "lucide-react";

export default function Transparency() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-50 text-pink-600 mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Minh bạch & Tin cậy</h1>
          <p className="text-gray-500 max-w-3xl mx-auto text-lg leading-relaxed">
            Chúng tôi cam kết 100% các khoản quyên góp được chuyển đến đúng nơi, đúng mục đích. Mọi hoạt động đều được công khai, minh bạch để đảm bảo niềm tin của cộng đồng.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16 space-y-24">

        {/* Đội ngũ sáng lập */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-8 h-8 text-pink-600" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Đội ngũ sáng lập</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Hoàng Đức Hải", role: "Founder", image: "https://picsum.photos/seed/ceo/300/300" },
            ].map((member, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <img src={member.image} alt={member.name} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" referrerPolicy="no-referrer" />
                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-pink-600 font-medium">{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nhà tài trợ & Đối tác */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Award className="w-8 h-8 text-pink-600" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Nhà tài trợ & Đối tác chiến lược</h2>
          </div>
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-70">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="w-32 h-16 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
            <p className="text-center text-gray-500 mt-8">
              Cùng với hơn 50+ đối tác và nhà tài trợ lớn nhỏ trên toàn quốc.
            </p>
          </div>
        </section>

        {/* Báo chí nói về chúng tôi */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Newspaper className="w-8 h-8 text-pink-600" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Báo chí nói về chúng tôi</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Nền tảng quyên góp minh bạch nhất năm 2023", source: "Báo Tuổi Trẻ", date: "15/10/2023", image: "https://picsum.photos/seed/news1/400/250" },
              { title: "Hàng triệu nụ cười được thắp sáng nhờ công nghệ", source: "VNExpress", date: "02/11/2023", image: "https://picsum.photos/seed/news2/400/250" },
              { title: "Giải thưởng công nghệ vì cộng đồng", source: "Dân Trí", date: "20/12/2023", image: "https://picsum.photos/seed/news3/400/250" },
              { title: "Cách người trẻ làm từ thiện thời 4.0", source: "Thanh Niên", date: "05/01/2024", image: "https://picsum.photos/seed/news4/400/250" }
            ].map((news, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                <img src={news.image} alt={news.title} className="w-full sm:w-40 h-32 object-cover rounded-xl" referrerPolicy="no-referrer" />
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <span className="font-semibold text-pink-600">{news.source}</span>
                    <span>•</span>
                    <span>{news.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors line-clamp-2">
                    {news.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 font-medium mt-auto">
                    Đọc bài viết <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
