import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, Timestamp, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Building2, Plus, List, Edit, Trash2, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { uploadImage } from "../lib/uploadImage";
import type { Campaign, Organization } from "../types";

export default function OrganizationDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  const [orgForm, setOrgForm] = useState({
    name: "",
    description: "",
    logo: "",
  });

  const [campaignForm, setCampaignForm] = useState({
    title: "",
    description: "",
    goal: "",
    image: "",
    category: "Giáo dục",
    dateEnd: "",
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 2) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch organization profile
        const orgQuery = query(collection(db, "organizations"), where("userId", "==", user.UID));
        const orgSnap = await getDocs(orgQuery);

        if (!orgSnap.empty) {
          const orgData = { id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() } as Organization;
          setOrganization(orgData);
          setOrgForm({
            name: orgData.name,
            description: orgData.description,
            logo: orgData.logo,
          });

          // Fetch campaigns for this organization
          const campQuery = query(collection(db, "campaigns"), where("organizationId", "==", orgData.id));
          const campSnap = await getDocs(campQuery);
          setCampaigns(campSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campaign[]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "organizations", organization.id), orgForm);
      setOrganization({ ...organization, ...orgForm });
      alert("Cập nhật hồ sơ thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật hồ sơ:", error);
      alert("Có lỗi xảy ra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsSubmitting(true);
    try {
      const campaignData = {
        ...campaignForm,
        goal: Number(campaignForm.goal),
        dateEnd: Timestamp.fromDate(new Date(campaignForm.dateEnd)),
        organizationId: organization.id,
      };

      if (editingCampaignId) {
        await updateDoc(doc(db, "campaigns", editingCampaignId), campaignData);
        alert("Cập nhật dự án thành công!");
        setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? { ...c, ...campaignData } as Campaign : c));
        setEditingCampaignId(null);
      } else {
        const docRef = await addDoc(collection(db, "campaigns"), {
          ...campaignData,
          raised: 0,
          donors: 0,
          status: "pending",
          dateCreated: Timestamp.now(),
        });
        alert("Tạo dự án thành công! Vui lòng chờ admin duyệt.");
        setCampaigns(prev => [{ id: docRef.id, ...campaignData, raised: 0, donors: 0, status: "pending", dateCreated: Timestamp.now() } as Campaign, ...prev]);
      }
      setCampaignForm({ title: "", description: "", goal: "", image: "", category: "Giáo dục", dateEnd: "" });
      setActiveTab("campaigns");
    } catch (error) {
      console.error("Lỗi tạo/cập nhật dự án:", error);
      alert("Có lỗi xảy ra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá dự án này?")) return;
    try {
      await deleteDoc(doc(db, "campaigns", id));
      setCampaigns(prev => prev.filter(c => c.id !== id));
      alert("Xoá dự án thành công!");
    } catch (error) {
      console.error("Lỗi xoá dự án:", error);
      alert("Có lỗi xảy ra khi xoá dự án.");
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
    });
    setEditingCampaignId(campaign.id);
    setActiveTab("create_campaign");
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý tổ chức</h1>
        <p className="text-gray-500 mt-2">Cập nhật hồ sơ và quản lý các dự án quyên góp</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "profile" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Building2 className="w-5 h-5" /> Hồ sơ tổ chức
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Dự án
          </div>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "campaigns" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <List className="w-5 h-5" /> Danh sách dự án
          </button>
          <button
            onClick={() => {
              setEditingCampaignId(null);
              setCampaignForm({ title: "", description: "", goal: "", image: "", category: "Giáo dục", dateEnd: "" });
              setActiveTab("create_campaign");
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === "create_campaign" ? "bg-pink-50 text-pink-600" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Plus className="w-5 h-5" /> Đăng dự án mới
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
          {activeTab === "profile" && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-pink-600" /> Cập nhật hồ sơ
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tên tổ chức</label>
                  <input
                    type="text"
                    required
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Ảnh logo</label>
                  <div className="flex items-center gap-4">
                    {orgForm.logo && (
                      <img src={orgForm.logo} alt="Logo" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
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
                              setOrgForm({ ...orgForm, logo: url });
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mô tả hoạt động</label>
                  <textarea
                    required
                    rows={5}
                    value={orgForm.description}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "campaigns" && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <List className="w-5 h-5 text-pink-600" /> Danh sách dự án
              </h2>
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={campaign.image} alt={campaign.title} className="w-16 h-16 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-gray-900">{campaign.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">
                            Mục tiêu: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(campaign.goal)}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${campaign.status === 'approved' ? 'bg-green-100 text-green-700' :
                              campaign.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                            {campaign.status === 'approved' ? 'Đã duyệt' :
                              campaign.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCampaign(campaign)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Chưa có dự án nào.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "create_campaign" && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                {editingCampaignId ? <Edit className="w-5 h-5 text-pink-600" /> : <Plus className="w-5 h-5 text-pink-600" />}
                {editingCampaignId ? "Cập nhật dự án" : "Tạo dự án quyên góp mới"}
              </h2>
              <form onSubmit={handleCreateCampaign} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tên dự án</label>
                    <input
                      type="text"
                      required
                      value={campaignForm.title}
                      onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                      placeholder="Nhập tên dự án..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mục tiêu quyên góp (VNĐ)</label>
                    <input
                      type="number"
                      required
                      min="10000"
                      value={campaignForm.goal}
                      onChange={(e) => setCampaignForm({ ...campaignForm, goal: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                      placeholder="VD: 50000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Danh mục</label>
                    <select
                      value={campaignForm.category}
                      onChange={(e) => setCampaignForm({ ...campaignForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    >
                      <option value="Giáo dục">Giáo dục</option>
                      <option value="Y tế">Y tế</option>
                      <option value="Cộng đồng">Cộng đồng</option>
                      <option value="Khẩn cấp">Khẩn cấp</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Ngày kết thúc</label>
                    <input
                      type="date"
                      required
                      value={campaignForm.dateEnd}
                      onChange={(e) => setCampaignForm({ ...campaignForm, dateEnd: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Ảnh bìa</label>
                    <div className="flex items-center gap-4">
                      {campaignForm.image && (
                        <img src={campaignForm.image} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
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
                                setCampaignForm({ ...campaignForm, image: url });
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
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                    <textarea
                      required
                      rows={5}
                      value={campaignForm.description}
                      onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                      placeholder="Nội dung chi tiết về dự án..."
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
                    {editingCampaignId ? "Cập nhật" : "Gửi duyệt dự án"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
