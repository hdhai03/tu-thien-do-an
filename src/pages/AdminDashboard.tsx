import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, Timestamp, query, where, updateDoc, doc, deleteDoc, orderBy, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarChart3, Plus, FileText, Heart, Image as ImageIcon, Loader2, CheckCircle, XCircle, Trash2, Edit, List, Upload, Building2 } from "lucide-react";
import { uploadImage } from "../lib/uploadImage";
import type { Post, Campaign, NewsItem } from "../types";

export default function AdminDashboard() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("stats");
    const [stats, setStats] = useState({ campaigns: 0, news: 0, totalRaised: 0 });
    const [loading, setLoading] = useState(true);
    const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
    const [processingPost, setProcessingPost] = useState<string | null>(null);

    // List states
    const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
    const [allNews, setAllNews] = useState<NewsItem[]>([]);
    const [allPosts, setAllPosts] = useState<Post[]>([]);
    const [orgRequests, setOrgRequests] = useState<any[]>([]);
    const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);

    // Edit states
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [campaignForm, setCampaignForm] = useState({
        title: "",
        description: "",
        goal: "",
        image: "",
        category: "Giáo dục",
        dateEnd: "",
        organizationId: "org1", // Default to org1 or fetch from orgs
    });
    const [newsForm, setNewsForm] = useState({
        title: "",
        summary: "",
        content: "",
        image: "",
        category: "Hoạt động",
    });

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 0) {
            navigate("/");
            return;
        }

        const fetchStats = async () => {
            try {
                const campaignsSnap = await getDocs(collection(db, "campaigns"));
                const newsSnap = await getDocs(collection(db, "news"));

                let totalRaised = 0;
                campaignsSnap.forEach(doc => {
                    totalRaised += doc.data().raised || 0;
                });

                setStats({
                    campaigns: campaignsSnap.size,
                    news: newsSnap.size,
                    totalRaised,
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };

        const fetchPendingPosts = async () => {
            try {
                const q = query(collection(db, "posts"), where("status", "==", "pending"));
                const snapshot = await getDocs(q);
                const postsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Post[];
                setPendingPosts(postsData);
            } catch (error) {
                console.error("Error fetching pending posts:", error);
            }
        };

        const fetchAllData = async () => {
            try {
                const [campaignsSnap, newsSnap, postsSnap, orgReqSnap, pendingCampSnap] = await Promise.all([
                    getDocs(collection(db, "campaigns")),
                    getDocs(collection(db, "news")),
                    getDocs(query(collection(db, "posts"), where("status", "==", "approved"))),
                    getDocs(query(collection(db, "organization_requests"), where("status", "==", "pending"))),
                    getDocs(query(collection(db, "campaigns"), where("status", "==", "pending")))
                ]);

                setAllCampaigns(campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campaign[]);
                setAllNews(newsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NewsItem[]);
                setAllPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]);
                setOrgRequests(orgReqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setPendingCampaigns(pendingCampSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campaign[]);
            } catch (error) {
                console.error("Error fetching all data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        fetchPendingPosts();
        fetchAllData();
    }, [isAuthenticated, user, navigate]);

    const handleApproveCampaign = async (campaign: Campaign, status: 'approved' | 'rejected') => {
        try {
            await updateDoc(doc(db, "campaigns", campaign.id), { status });

            if (status === 'approved') {
                // Notify all users about new campaign
                const usersSnap = await getDocs(collection(db, "users"));
                const batch = writeBatch(db);
                usersSnap.forEach(userDoc => {
                    const notifRef = doc(collection(db, "notifications"));
                    batch.set(notifRef, {
                        userId: userDoc.data().UID,
                        type: "new_campaign",
                        message: `Dự án mới: ${campaign.title}`,
                        read: false,
                        createdAt: Timestamp.now(),
                        link: `/du-an/${campaign.id}`,
                    });
                });
                await batch.commit();
            }

            setPendingCampaigns(prev => prev.filter(c => c.id !== campaign.id));
            alert(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} dự án!`);
        } catch (error) {
            console.error("Lỗi duyệt dự án:", error);
            alert("Có lỗi xảy ra khi duyệt dự án.");
        }
    };

    const handleApprovePost = async (post: Post, status: 'approved' | 'rejected') => {
        setProcessingPost(post.id);
        try {
            await updateDoc(doc(db, "posts", post.id), { status });

            // Send notification if approved
            if (status === 'approved') {
                await addDoc(collection(db, "notifications"), {
                    userId: post.userId,
                    type: "approved",
                    message: "Bài viết của bạn đã được duyệt và hiển thị trên cộng đồng.",
                    read: false,
                    createdAt: Timestamp.now(),
                    link: `/cong-dong`,
                });
            }

            setPendingPosts(prev => prev.filter(p => p.id !== post.id));
        } catch (error) {
            console.error("Error updating post status:", error);
            alert("Có lỗi xảy ra khi duyệt bài.");
        } finally {
            setProcessingPost(null);
        }
    };

    const handleCreateNews = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingNewsId) {
                await updateDoc(doc(db, "news", editingNewsId), {
                    ...newsForm,
                });
                alert("Cập nhật tin tức thành công!");
                setAllNews(prev => prev.map(n => n.id === editingNewsId ? { ...n, ...newsForm } : n));
                setEditingNewsId(null);
            } else {
                const docRef = await addDoc(collection(db, "news"), {
                    ...newsForm,
                    date: Timestamp.now(),
                });
                alert("Đăng tin tức thành công!");
                setAllNews(prev => [{ id: docRef.id, ...newsForm, date: Timestamp.now() } as NewsItem, ...prev]);

                // Notify all users
                const usersSnap = await getDocs(collection(db, "users"));
                const batch = writeBatch(db);
                usersSnap.forEach(userDoc => {
                    const notifRef = doc(collection(db, "notifications"));
                    batch.set(notifRef, {
                        userId: userDoc.data().UID,
                        type: "new_news",
                        message: `Tin tức mới: ${newsForm.title}`,
                        read: false,
                        createdAt: Timestamp.now(),
                        link: `/tin-tuc/${docRef.id}`,
                    });
                });
                await batch.commit();
            }
            setNewsForm({ title: "", summary: "", content: "", image: "", category: "Hoạt động" });
            setActiveTab("manage_news");
        } catch (error) {
            console.error("Lỗi đăng tin tức:", error);
            alert("Có lỗi xảy ra khi đăng tin tức.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá dự án này?")) return;
        try {
            await deleteDoc(doc(db, "campaigns", id));
            setAllCampaigns(prev => prev.filter(c => c.id !== id));
            alert("Xoá dự án thành công!");
        } catch (error) {
            console.error("Lỗi xoá dự án:", error);
            alert("Có lỗi xảy ra khi xoá dự án.");
        }
    };

    const handleDeleteNews = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá tin tức này?")) return;
        try {
            await deleteDoc(doc(db, "news", id));
            setAllNews(prev => prev.filter(n => n.id !== id));
            alert("Xoá tin tức thành công!");
        } catch (error) {
            console.error("Lỗi xoá tin tức:", error);
            alert("Có lỗi xảy ra khi xoá tin tức.");
        }
    };

    const handleDeletePost = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xoá bài viết này?")) return;
        try {
            await deleteDoc(doc(db, "posts", id));
            setAllPosts(prev => prev.filter(p => p.id !== id));
            alert("Xoá bài viết thành công!");
        } catch (error) {
            console.error("Lỗi xoá bài viết:", error);
            alert("Có lỗi xảy ra khi xoá bài viết.");
        }
    };

    const handleEditCampaign = (campaign: Campaign) => {
        setCampaignForm({
            title: campaign.title,
            description: campaign.description,
            goal: campaign.goal.toString(),
            image: campaign.image,
            category: campaign.category,
            dateEnd: campaign.dateEnd instanceof Timestamp ? campaign.dateEnd.toDate().toISOString().split('T')[0] : "",
            organizationId: campaign.organizationId,
        });
        setEditingCampaignId(campaign.id);
        setActiveTab("campaigns");
    };

    const handleEditNews = (news: NewsItem) => {
        setNewsForm({
            title: news.title,
            summary: news.summary,
            content: news.content,
            image: news.image,
            category: news.category,
        });
        setEditingNewsId(news.id);
        setActiveTab("news");
    };

    const handleApproveOrgRequest = async (req: any, status: 'approved' | 'rejected') => {
        try {
            const batch = writeBatch(db);

            // Update request status
            batch.update(doc(db, "organization_requests", req.id), { status });

            if (status === 'approved') {
                // Update user role to 2 (organization)
                const usersSnap = await getDocs(query(collection(db, "users"), where("UID", "==", req.userId)));
                if (!usersSnap.empty) {
                    const userDoc = usersSnap.docs[0];
                    batch.update(doc(db, "users", userDoc.id), { role: 2 });
                }

                // Create organization document
                const orgRef = doc(collection(db, "organizations"));
                batch.set(orgRef, {
                    name: req.organizationName,
                    description: req.description,
                    userId: req.userId,
                    logo: req.logo || "",
                    campaignCount: 0,
                    totalRaised: 0,
                    createdAt: Timestamp.now()
                });
            }

            // Send notification
            const notifRef = doc(collection(db, "notifications"));
            batch.set(notifRef, {
                userId: req.userId,
                type: "approved",
                message: status === 'approved' ? `Yêu cầu đăng ký tổ chức "${req.organizationName}" đã được duyệt!` : `Yêu cầu đăng ký tổ chức "${req.organizationName}" đã bị từ chối.`,
                read: false,
                createdAt: Timestamp.now(),
            });

            await batch.commit();

            setOrgRequests(prev => prev.filter(r => r.id !== req.id));
            alert(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu!`);
        } catch (error) {
            console.error("Lỗi xử lý yêu cầu:", error);
            alert("Có lỗi xảy ra.");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
    );

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Quản trị hệ thống</h1>
                <p className="text-gray-500 mt-2">Quản lý dự án, tin tức và theo dõi số liệu</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full md:w-64 shrink-0 space-y-2">
                    <button
                        onClick={() => setActiveTab("stats")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "stats" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <BarChart3 className="w-5 h-5" /> Thống kê
                    </button>

                    <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Quản lý
                    </div>

                    <button
                        onClick={() => setActiveTab("manage_campaigns")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "manage_campaigns" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <List className="w-5 h-5" /> Danh sách dự án
                    </button>
                    <button
                        onClick={() => setActiveTab("pending_campaigns")}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "pending_campaigns" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5" /> Duyệt dự án
                        </div>
                        {pendingCampaigns.length > 0 && (
                            <span className="bg-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {pendingCampaigns.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("manage_news")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "manage_news" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <List className="w-5 h-5" /> Danh sách tin tức
                    </button>
                    <button
                        onClick={() => {
                            setEditingNewsId(null);
                            setNewsForm({ title: "", summary: "", content: "", image: "", category: "Hoạt động" });
                            setActiveTab("news");
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "news" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <Plus className="w-5 h-5" /> Đăng tin tức mới
                    </button>

                    <button
                        onClick={() => setActiveTab("manage_posts")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "manage_posts" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <List className="w-5 h-5" /> Quản lý bài viết
                    </button>
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "pending" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5" /> Duyệt bài
                        </div>
                        {pendingPosts.length > 0 && (
                            <span className="bg-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {pendingPosts.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("org_requests")}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "org_requests" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5" /> Duyệt tổ chức
                        </div>
                        {orgRequests.length > 0 && (
                            <span className="bg-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {orgRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
                    {activeTab === "stats" && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Tổng quan số liệu</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100">
                                    <div className="text-pink-600 mb-2"><Heart className="w-6 h-6" /></div>
                                    <div className="text-3xl font-black text-gray-900 mb-1">{stats.campaigns}</div>
                                    <div className="text-sm font-medium text-gray-500">Dự án quyên góp</div>
                                </div>
                                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                    <div className="text-blue-600 mb-2"><FileText className="w-6 h-6" /></div>
                                    <div className="text-3xl font-black text-gray-900 mb-1">{stats.news}</div>
                                    <div className="text-sm font-medium text-gray-500">Tin tức & Hoạt động</div>
                                </div>
                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                    <div className="text-green-600 mb-2"><BarChart3 className="w-6 h-6" /></div>
                                    <div className="text-3xl font-black text-gray-900 mb-1">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRaised)}
                                    </div>
                                    <div className="text-sm font-medium text-gray-500">Tổng tiền quyên góp</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "manage_campaigns" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <List className="w-5 h-5 text-pink-600" /> Quản lý dự án
                            </h2>
                            <div className="space-y-4">
                                {allCampaigns.map(campaign => (
                                    <div key={campaign.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <img src={campaign.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-gray-900 line-clamp-1">{campaign.title}</h4>
                                                <p className="text-sm text-gray-500">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(campaign.goal)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditCampaign(campaign)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteCampaign(campaign.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "pending_campaigns" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-pink-600" /> Duyệt dự án quyên góp
                            </h2>

                            {pendingCampaigns.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                                    Không có dự án nào đang chờ duyệt.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {pendingCampaigns.map(campaign => (
                                        <div key={campaign.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                            <div className="flex items-start gap-4 mb-4">
                                                <img src={campaign.image} alt={campaign.title} className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-900 text-lg">{campaign.title}</h4>
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Mục tiêu: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(campaign.goal)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Ngày kết thúc: {campaign.dateEnd instanceof Timestamp ? campaign.dateEnd.toDate().toLocaleDateString('vi-VN') : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                                                <h5 className="text-sm font-bold text-gray-700 mb-2">Mô tả chi tiết:</h5>
                                                <p className="text-gray-600 whitespace-pre-wrap">{campaign.description}</p>
                                            </div>

                                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => handleApproveCampaign(campaign, 'approved')}
                                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Duyệt dự án
                                                </button>
                                                <button
                                                    onClick={() => handleApproveCampaign(campaign, 'rejected')}
                                                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "manage_news" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <List className="w-5 h-5 text-pink-600" /> Quản lý tin tức
                            </h2>
                            <div className="space-y-4">
                                {allNews.map(news => (
                                    <div key={news.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <img src={news.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-gray-900 line-clamp-1">{news.title}</h4>
                                                <p className="text-sm text-gray-500">{news.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditNews(news)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteNews(news.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "manage_posts" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <List className="w-5 h-5 text-pink-600" /> Quản lý bài viết cộng đồng
                            </h2>
                            <div className="space-y-4">
                                {allPosts.map(post => (
                                    <div key={post.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {post.authorAvatar ? (
                                                    <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-pink-600 font-bold">{post.authorName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{post.authorName}</h4>
                                                <p className="text-sm text-gray-500 line-clamp-1">{post.content}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleDeletePost(post.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "news" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                {editingNewsId ? <Edit className="w-5 h-5 text-pink-600" /> : <Plus className="w-5 h-5 text-pink-600" />}
                                {editingNewsId ? "Cập nhật tin tức" : "Đăng tin tức mới"}
                            </h2>
                            <form onSubmit={handleCreateNews} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Tiêu đề tin tức</label>
                                        <input
                                            type="text"
                                            required
                                            value={newsForm.title}
                                            onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                            placeholder="Nhập tiêu đề..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Danh mục</label>
                                            <select
                                                value={newsForm.category}
                                                onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                            >
                                                <option value="Hoạt động">Hoạt động</option>
                                                <option value="Cập nhật">Cập nhật</option>
                                                <option value="Câu chuyện">Câu chuyện</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Ảnh minh họa</label>
                                            <div className="flex items-center gap-4">
                                                {newsForm.image && (
                                                    <img src={newsForm.image} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
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
                                                                    setNewsForm({ ...newsForm, image: url });
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
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Tóm tắt</label>
                                        <textarea
                                            required
                                            rows={2}
                                            value={newsForm.summary}
                                            onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                            placeholder="Đoạn tóm tắt ngắn..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Nội dung chi tiết</label>
                                        <textarea
                                            required
                                            rows={8}
                                            value={newsForm.content}
                                            onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                            placeholder="Nội dung bài viết..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Đăng tin tức
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    {activeTab === "pending" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-pink-600" /> Duyệt bài cộng đồng
                            </h2>

                            {pendingPosts.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                                    Không có bài viết nào đang chờ duyệt.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {pendingPosts.map(post => (
                                        <div key={post.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    {post.authorAvatar ? (
                                                        <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-pink-600 font-bold">{post.authorName.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{post.authorName}</h4>
                                                    <p className="text-xs text-gray-500">
                                                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString('vi-VN') : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

                                            {post.images && post.images.length > 0 && (
                                                <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                                                    <img src={post.images[0]} alt="" className="w-full h-auto max-h-[300px] object-cover" />
                                                </div>
                                            )}

                                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => handleApprovePost(post, 'approved')}
                                                    disabled={processingPost === post.id}
                                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {processingPost === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                    Duyệt bài
                                                </button>
                                                <button
                                                    onClick={() => handleApprovePost(post, 'rejected')}
                                                    disabled={processingPost === post.id}
                                                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {processingPost === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === "org_requests" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-pink-600" /> Duyệt đăng ký tổ chức
                            </h2>

                            {orgRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                                    Không có yêu cầu đăng ký tổ chức nào.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {orgRequests.map(req => (
                                        <div key={req.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                            <div className="flex items-center gap-4 mb-4">
                                                {req.logo ? (
                                                    <img src={req.logo} alt={req.organizationName} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600">
                                                        <Building2 className="w-8 h-8" />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{req.organizationName}</h4>
                                                    <p className="text-sm text-gray-500">
                                                        Ngày gửi: {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString('vi-VN') : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                                                <h5 className="text-sm font-bold text-gray-700 mb-2">Mô tả hoạt động:</h5>
                                                <p className="text-gray-600 whitespace-pre-wrap">{req.description}</p>
                                            </div>

                                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => handleApproveOrgRequest(req, 'approved')}
                                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Duyệt tổ chức
                                                </button>
                                                <button
                                                    onClick={() => handleApproveOrgRequest(req, 'rejected')}
                                                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
