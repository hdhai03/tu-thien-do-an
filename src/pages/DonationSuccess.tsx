import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function DonationSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (!campaignId) {
            navigate("/");
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate(`/du-an/${campaignId}`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [campaignId, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Quyên góp thành công!</h1>
                <p className="text-gray-600 mb-8">
                    Cảm ơn tấm lòng hảo tâm của bạn. Khoản đóng góp của bạn sẽ giúp đỡ được rất nhiều người.
                </p>

                <div className="text-sm text-gray-500 mb-6">
                    Tự động quay lại trang dự án sau <span className="font-bold text-pink-600">{countdown}</span> giây...
                </div>

                <button
                    onClick={() => navigate(`/du-an/${campaignId}`)}
                    className="w-full bg-pink-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-pink-700 transition-colors"
                >
                    Quay lại ngay
                </button>
            </div>
        </div>
    );
}
