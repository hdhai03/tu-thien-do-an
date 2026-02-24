import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp, onSnapshot, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Post, Comment as CommentType } from "../types";
import { Heart, MessageCircle, Image as ImageIcon, Send, Loader2, User } from "lucide-react";
import { uploadImage } from "../lib/uploadImage";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function Community() {
    const { user, isAuthenticated } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostImage, setNewPostImage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "posts"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !user) {
            alert("Vui lòng đăng nhập để đăng bài.");
            return;
        }
        if (!newPostContent.trim()) return;

        setIsSubmitting(true);
        try {
            const postData = {
                userId: user.UID,
                authorName: user.fullName || "Người dùng",
                authorAvatar: user.avatar || "",
                content: newPostContent,
                images: newPostImage ? [newPostImage] : [],
                likes: [],
                commentCount: 0,
                status: "pending",
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, "posts"), postData);
            setNewPostContent("");
            setNewPostImage("");
            alert("Bài viết của bạn đã được gửi và đang chờ admin duyệt.");
        } catch (error) {
            console.error("Lỗi đăng bài:", error);
            alert("Có lỗi xảy ra khi đăng bài.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (post: Post) => {
        if (!isAuthenticated || !user) {
            alert("Vui lòng đăng nhập để thích bài viết.");
            return;
        }

        const postRef = doc(db, "posts", post.id);
        const isLiked = post.likes?.includes(user.UID);

        try {
            if (isLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(user.UID)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(user.UID)
                });

                // Gửi thông báo cho chủ bài viết
                if (post.userId !== user.UID) {
                    await addDoc(collection(db, "notifications"), {
                        userId: post.userId,
                        type: "like",
                        message: `${user.fullName || "Ai đó"} đã thích bài viết của bạn.`,
                        read: false,
                        createdAt: Timestamp.now(),
                        link: `/cong-dong`,
                    });
                }
            }
        } catch (error) {
            console.error("Lỗi khi like:", error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center">
                    <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-6">
                        <Heart className="w-8 h-8 text-pink-600" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Cộng đồng Nuôi Em
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Vui lòng đăng nhập để có thể xem và chia sẻ những trải nghiệm từ thiện tuyệt vời của bạn cùng mọi người.
                    </p>
                    <div className="mt-8 space-y-4">
                        <a
                            href="/dang-nhap"
                            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-pink-600 hover:bg-pink-700 md:py-4 md:text-lg transition-colors"
                        >
                            Đăng nhập ngay
                        </a>
                        <a
                            href="/dang-ky"
                            className="w-full flex items-center justify-center px-8 py-3 border-2 border-pink-100 text-base font-medium rounded-xl text-pink-600 bg-white hover:bg-pink-50 md:py-4 md:text-lg transition-colors"
                        >
                            Tạo tài khoản mới
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Cộng đồng</h1>
                    <p className="text-gray-500 mt-2">Chia sẻ những câu chuyện và trải nghiệm từ thiện của bạn</p>
                </div>

                {/* Create Post Box */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center shrink-0 overflow-hidden">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 text-pink-300" />
                            )}
                        </div>
                        <form onSubmit={handleCreatePost} className="flex-1">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="Bạn muốn chia sẻ trải nghiệm gì hôm nay?"
                                className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-pink-500/20 resize-none"
                                rows={3}
                                required
                            />

                            {newPostImage && (
                                <div className="relative mt-3 inline-block">
                                    <img src={newPostImage} alt="Preview" className="h-32 rounded-lg object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setNewPostImage("")}
                                        className="absolute top-1 right-1 bg-gray-900/50 text-white rounded-full p-1 hover:bg-gray-900"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-pink-600 cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-pink-50">
                                        <ImageIcon className="w-5 h-5" />
                                        <span>Thêm ảnh</span>
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
                                                        setNewPostImage(url);
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
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newPostContent.trim()}
                                    className="bg-pink-600 text-white px-6 py-2 rounded-full font-medium hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Đăng bài
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Posts Feed */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
                        Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!
                    </div>
                ) : (
                    <div className="space-y-6">
                        {posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onLike={() => handleLike(post)}
                                isLiked={isAuthenticated && user ? post.likes?.includes(user.UID) : false}
                                activeCommentPostId={activeCommentPostId}
                                setActiveCommentPostId={setActiveCommentPostId}
                            />
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
}

function PostCard({ post, onLike, isLiked, activeCommentPostId, setActiveCommentPostId }: {
    post: Post,
    onLike: () => void,
    isLiked: boolean,
    activeCommentPostId: string | null,
    setActiveCommentPostId: (id: string | null) => void
}) {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState<CommentType[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    const isCommenting = activeCommentPostId === post.id;

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const q = query(
                collection(db, "comments"),
                where("postId", "==", post.id),
                orderBy("createdAt", "asc")
            );
            const snapshot = await getDocs(q);
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CommentType[];
            setComments(commentsData);
        } catch (error) {
            console.error("Lỗi tải bình luận:", error);
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        if (isCommenting) {
            fetchComments();
        }
    }, [isCommenting, post.id]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !user || !newComment.trim()) return;

        setSubmittingComment(true);
        try {
            const commentData = {
                postId: post.id,
                userId: user.UID,
                authorName: user.fullName || "Người dùng",
                authorAvatar: user.avatar || "",
                content: newComment,
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, "comments"), commentData);

            // Update comment count
            await updateDoc(doc(db, "posts", post.id), {
                commentCount: increment(1)
            });

            // Send notification
            if (post.userId !== user.UID) {
                await addDoc(collection(db, "notifications"), {
                    userId: post.userId,
                    type: "comment",
                    message: `${user.fullName || "Ai đó"} đã bình luận về bài viết của bạn.`,
                    read: false,
                    createdAt: Timestamp.now(),
                    link: `/cong-dong`,
                });
            }

            setNewComment("");
            fetchComments();
        } catch (error) {
            console.error("Lỗi đăng bình luận:", error);
        } finally {
            setSubmittingComment(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center overflow-hidden shrink-0">
                    {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-5 h-5 text-pink-300" />
                    )}
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{post.authorName}</h4>
                    <p className="text-xs text-gray-500">
                        {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: vi }) : ""}
                    </p>
                </div>
            </div>

            {/* Content */}
            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

            {/* Images */}
            {post.images && post.images.length > 0 && (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-100">
                    <img src={post.images[0]} alt="" className="w-full h-auto max-h-[500px] object-cover" />
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                <button
                    onClick={onLike}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'}`}
                >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likes?.length || 0}</span>
                </button>
                <button
                    onClick={() => setActiveCommentPostId(isCommenting ? null : post.id)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-pink-600 transition-colors"
                >
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.commentCount || 0}</span>
                </button>
            </div>

            {/* Comments Section */}
            {isCommenting && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                    {/* Comment List */}
                    <div className="space-y-4 mb-4">
                        {loadingComments ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                        ) : comments.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-2">Chưa có bình luận nào.</p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 mt-1">
                                        {comment.authorAvatar ? (
                                            <img src={comment.authorAvatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2">
                                        <div className="flex items-baseline justify-between gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-900">{comment.authorName}</span>
                                            <span className="text-[10px] text-gray-500">
                                                {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: vi }) : ""}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Comment */}
                    {isAuthenticated && (
                        <form onSubmit={handleCommentSubmit} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center overflow-hidden shrink-0">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-4 h-4 text-pink-300" />
                                )}
                            </div>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Viết bình luận..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-2 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingComment || !newComment.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-pink-600 hover:bg-pink-50 rounded-full transition-colors disabled:opacity-50"
                                >
                                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
