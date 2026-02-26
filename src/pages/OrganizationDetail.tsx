import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Building2, Heart, Target, ShieldCheck, MessageCircle, ThumbsUp, Calendar, User, ChevronRight } from "lucide-react";
import type { Campaign, Organization } from "../types";

export default function OrganizationDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"campaigns" | "posts">("campaigns");
    const [commentText, setCommentText] = useState("");
    const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                // Fetch org details
                const orgDoc = await getDoc(doc(db, "organizations", id));
                if (orgDoc.exists()) {
                    setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
                }

                // Fetch campaigns
                const campQuery = query(collection(db, "campaigns"), where("organizationId", "==", id));
                const campSnap = await getDocs(campQuery);
                setCampaigns(campSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Campaign[]);

                // Fetch posts
                const postsQuery = query(collection(db, "organization_posts"), where("organizationId", "==", id), orderBy("createdAt", "desc"));
                const postsSnap = await getDocs(postsQuery);
                setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching organization data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleLike = async (postId: string, currentLikes: string[]) => {
        if (!user) {
            alert("Vui lòng đăng nhập để thích bài viết.");
            return;
        }

        try {
            const postRef = doc(db, "organization_posts", postId);
            let newLikes = [...(currentLikes || [])];

            if (newLikes.includes(user.UID)) {
                newLikes = newLikes.filter(uid => uid !== user.UID);
            } else {
                newLikes.push(user.UID);
            }

            await updateDoc(postRef, { likes: newLikes });

            setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
        } catch (error) {
            console.error("Error updating like:", error);
        }
    };

    const handleComment = async (postId: string) => {
        if (!user) {
            alert("Vui lòng đăng nhập để bình luận.");
            return;
        }
        if (!commentText.trim()) return;

        try {
            const newComment = {
                userId: user.UID,
                userName: user.fullName || "Người dùng",
                userAvatar: user.avatar || "",
                text: commentText,
                createdAt: Timestamp.now()
            };

            const postRef = doc(db, "organization_posts", postId);
            const post = posts.find(p => p.id === postId);
            const updatedComments = [...(post?.comments || []), newComment];

            await updateDoc(postRef, { comments: updatedComments });

            setPosts(posts.map(p => p.id === postId ? { ...p, comments: updatedComments } : p));
            setCommentText("");
            setActiveCommentPost(null);
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-600"></div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">Không tìm thấy tổ chức</h2>
                <Link to="/to-chuc" className="text-pink-600 mt-4 inline-block">Quay lại danh sách</Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header Breadcrumbs */}
            <div className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                    <Link to="/" className="hover:text-pink-600">Trang chủ</Link>
                    <ChevronRight className="w-4 h-4" />
                    <Link to="/to-chuc" className="hover:text-pink-600">Tổ chức</Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-gray-900 truncate font-medium">{organization.name}</span>
                </div>
            </div>

            {/* Organization Profile Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden shrink-0">
                            {organization.logo ? (
                                <img src={organization.logo} alt={organization.name} className="w-full h-full object-cover" />
                            ) : (
                                <Building2 className="w-16 h-16 text-gray-300 m-auto mt-8 md:mt-12" />
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                                {organization.name}
                                <ShieldCheck className="w-6 h-6 text-green-500" />
                            </h1>
                            <p className="text-gray-600 mb-6 max-w-2xl mx-auto md:mx-0">
                                {organization.description}
                            </p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <div className="bg-pink-50 rounded-xl px-6 py-3 text-center min-w-[120px]">
                                    <div className="text-pink-600 text-sm mb-1 flex items-center justify-center gap-1 font-medium">
                                        <Target className="w-4 h-4" /> Dự án
                                    </div>
                                    <div className="font-bold text-gray-900 text-xl">{organization.campaignCount || 0}</div>
                                </div>
                                <div className="bg-pink-50 rounded-xl px-6 py-3 text-center min-w-[120px]">
                                    <div className="text-pink-600 text-sm mb-1 flex items-center justify-center gap-1 font-medium">
                                        <Heart className="w-4 h-4" /> Đã gọi
                                    </div>
                                    <div className="font-bold text-gray-900 text-xl">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(organization.totalRaised || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mx-auto max-w-5xl px-4 mt-8">
                <div className="flex gap-4 border-b border-gray-200 mb-8">
                    <button
                        onClick={() => setActiveTab("campaigns")}
                        className={`pb-4 px-4 font-bold text-lg border-b-2 transition-colors ${activeTab === "campaigns" ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-900"
                            }`}
                    >
                        Dự án ({campaigns.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`pb-4 px-4 font-bold text-lg border-b-2 transition-colors ${activeTab === "posts" ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-900"
                            }`}
                    >
                        Bài viết ({posts.length})
                    </button>
                </div>

                {/* Tab Content: Campaigns */}
                {activeTab === "campaigns" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.length > 0 ? campaigns.map((campaign) => (
                            <Link key={campaign.id} to={`/du-an/${campaign.id}`} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                <div className="relative h-48 overflow-hidden">
                                    <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-700">
                                        {campaign.category}
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-pink-600 transition-colors">
                                        {campaign.title}
                                    </h3>
                                    <div className="mt-auto pt-4">
                                        <div className="flex justify-between items-end text-sm mb-2">
                                            <div>
                                                <span className="font-bold text-pink-600">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(campaign.raised)}
                                                </span>
                                                <span className="text-gray-400 text-xs ml-1">
                                                    / {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(campaign.goal)}
                                                </span>
                                            </div>
                                            <span className="text-gray-500">
                                                {Math.round((campaign.raised / campaign.goal) * 100)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-pink-600 h-2 rounded-full" style={{ width: `${Math.min(100, (campaign.raised / campaign.goal) * 100)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                                Tổ chức này chưa có dự án nào.
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content: Posts */}
                {activeTab === "posts" && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        {posts.length > 0 ? posts.map((post) => {
                            const isLiked = user ? (post.likes || []).includes(user.UID) : false;

                            return (
                                <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Post Header */}
                                    <div className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                                            {organization.logo ? (
                                                <img src={organization.logo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-6 h-6 text-gray-400 m-auto mt-2" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-1">
                                                {organization.name}
                                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "Vừa xong"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Post Content */}
                                    <div className="px-4 pb-3 text-gray-800 whitespace-pre-wrap">
                                        {post.content}
                                    </div>

                                    {/* Post Image */}
                                    {post.image && (
                                        <div className="w-full bg-gray-50">
                                            <img src={post.image} alt="" className="w-full max-h-[500px] object-contain" />
                                        </div>
                                    )}

                                    {/* Post Stats */}
                                    <div className="px-4 py-3 border-b border-gray-50 flex justify-between text-sm text-gray-500">
                                        <div>{(post.likes || []).length} lượt thích</div>
                                        <div>{(post.comments || []).length} bình luận</div>
                                    </div>

                                    {/* Post Actions */}
                                    <div className="px-2 py-1 flex">
                                        <button
                                            onClick={() => handleLike(post.id, post.likes)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${isLiked ? 'text-pink-600 bg-pink-50' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /> Thích
                                        </button>
                                        <button
                                            onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            <MessageCircle className="w-5 h-5" /> Bình luận
                                        </button>
                                    </div>

                                    {/* Comments Section */}
                                    {activeCommentPost === post.id && (
                                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                                            {/* Comment Input */}
                                            <div className="flex gap-3 mb-6">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                    {user?.avatar ? (
                                                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-gray-400 m-auto mt-1.5" />
                                                    )}
                                                </div>
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder={user ? "Viết bình luận..." : "Vui lòng đăng nhập để bình luận"}
                                                        disabled={!user}
                                                        className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-300"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleComment(post.id);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleComment(post.id)}
                                                        disabled={!user || !commentText.trim()}
                                                        className="bg-pink-600 text-white px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
                                                    >
                                                        Gửi
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Comments List */}
                                            <div className="space-y-4">
                                                {(post.comments || []).map((comment: any, idx: number) => (
                                                    <div key={idx} className="flex gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                            {comment.userAvatar ? (
                                                                <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-5 h-5 text-gray-400 m-auto mt-1.5" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-2 inline-block">
                                                                <div className="font-bold text-sm text-gray-900">{comment.userName}</div>
                                                                <div className="text-sm text-gray-800">{comment.text}</div>
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1 ml-2">
                                                                {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "Vừa xong"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                                Tổ chức này chưa có bài viết nào.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
