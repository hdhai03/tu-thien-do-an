import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import cors from "cors";
import dotenv from "dotenv";
import { createRequire } from "module";
import { PayOS } from '@payos/node';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

console.log("--- 🚀 ĐANG KHỞI TẠO SERVER ---");



// 1. KHỞI TẠO FIREBASE
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log("🔥 Firebase Admin đã sẵn sàng.");
  } catch (error) {
    console.error("❌ Lỗi cấu hình Firebase:", error);
  }
}
const db = admin.firestore();

// 2. KHỞI TẠO PAYOS
const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || "",
  apiKey: process.env.PAYOS_API_KEY || "",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || ""
});
console.log("💳 PayOS Client đã được cấu hình.");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: false }));

  // Cấu hình Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // API Upload ảnh đơn giản
  app.post("/api/upload", async (req, res) => {
    try {
      let fileStr = req.body.image; // Gửi ảnh dạng Base64 từ Frontend

      // Hack for PDF: change mime type to text/plain so Cloudinary doesn't block delivery
      if (fileStr.startsWith('data:application/pdf')) {
        fileStr = fileStr.replace('data:application/pdf', 'data:text/plain');
      }

      const uploadResponse = await cloudinary.uploader.upload(fileStr, {
        folder: 'nuoi_em', // Lưu vào thư mục nuoi_em
        resource_type: 'auto', // Tự động nhận diện loại file (image, video, raw cho pdf)
      });
      res.json({ url: uploadResponse.secure_url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi khi upload file' });
    }
  });

  // --- 1. API TẠO LINK THANH TOÁN ---
  app.post("/api/payment/create-link", async (req: any, res: any) => {
    console.log("\n📩 Nhận yêu cầu tạo link thanh toán:", req.body);

    try {
      const { amount, campaignId, customerName, userId, isAnonymous } = req.body;
      const orderCode = Number(String(Date.now()).slice(-6));

      // 💡 SỬA: Lưu vào collection riêng biệt dành cho các đơn chờ thanh toán
      await db.collection("pending_donations").doc(String(orderCode)).set({
        campaignId,
        userId: userId || "",
        customerName: customerName || "Nhà hảo tâm ẩn danh",
        amount: Number(amount),
        isAnonymous: isAnonymous || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const paymentData = {
        orderCode: orderCode,
        amount: Number(amount),
        description: `Quyen gop ${orderCode}`,
        // URL này dùng để quay về trang web sau khi khách thanh toán xong (về Frontend)
        returnUrl: `https://adaline-prospectless-barb.ngrok-free.dev/quyen-gop-thanh-cong?campaignId=${campaignId}`,
        cancelUrl: `https://adaline-prospectless-barb.ngrok-free.dev/du-an/${campaignId}`,
      };

      const paymentLink = await payOS.paymentRequests.create(paymentData);
      console.log(`📝 Đã tạo link & lưu đơn tạm ${orderCode}`);
      res.json({ paymentUrl: paymentLink.checkoutUrl });

    } catch (error: any) {
      console.error("❌ Lỗi tạo link:", error.message);
      res.status(500).json({ message: "Không thể tạo link", error: error.message });
    }
  });

  // --- 2. API WEBHOOK ---
  app.post('/webhook', async (req, res) => {
    console.log("\n🔔 NHẬN WEBHOOK TỪ PAYOS:", req.body);
    try {
      // Xác thực webhook (bắt buộc)
      payOS.webhooks.verify(req.body);

      if (req.body.code === "00") {
        const data = req.body.data;
        const orderCode = data.orderCode;

        // 💡 SỬA: Tìm trong collection "pending_donations"
        const pendingRef = db.collection("pending_donations").doc(String(orderCode));
        const doc = await pendingRef.get();

        if (doc.exists) {
          const info = doc.data();
          const batch = db.batch();

          // A. Tạo bản ghi quyên góp chính thức
          const donationRef = db.collection("donations").doc();
          batch.set(donationRef, {
            campaignId: info?.campaignId,
            userId: info?.userId || "",
            fullname: info?.customerName || "Nhà hảo tâm ẩn danh",
            amount: data.amount,
            isAnonymous: info?.isAnonymous || false,
            donationDate: admin.firestore.FieldValue.serverTimestamp(),
            transactionId: data.paymentLinkId,
            orderCode: orderCode
          });

          // B. Cập nhật số tiền trong Campaign
          const campaignRef = db.collection("campaigns").doc(info?.campaignId);
          batch.update(campaignRef, {
            raised: admin.firestore.FieldValue.increment(data.amount),
            donors: admin.firestore.FieldValue.increment(1)
          });

          // C. Cập nhật số tiền cho Tổ chức (nếu có)
          const campaignDoc = await campaignRef.get();
          if (campaignDoc.exists) {
            const campaignData = campaignDoc.data();
            if (campaignData?.organizationId) {
              const orgRef = db.collection("organizations").doc(campaignData.organizationId);
              batch.update(orgRef, {
                totalRaised: admin.firestore.FieldValue.increment(data.amount)
              });
            }
          }

          // D. XÓA dữ liệu tạm ở pending_donations
          batch.delete(pendingRef);

          await batch.commit();
          console.log(`✅ Đã chuyển đơn ${orderCode} sang chính thức và cập nhật Campaign/Organization.`);
        } else {
          console.warn(`⚠️ Không tìm thấy đơn tạm: ${orderCode}`);
        }
      }
      res.status(200).send('OK');
    } catch (error) {
      console.error('⚠️ Lỗi Webhook:', error);
      res.status(200).send('OK');
    }
  });
  // --- TÍCH HỢP VITE ---
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Đang khởi động Vite Middleware...");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ SERVER ĐÃ CHẠY TẠI: http://localhost:${PORT}`);
    console.log("------------------------------------------");
  });
}

startServer().catch((err) => {
  console.error("❌ Lỗi khởi động server:", err);
});