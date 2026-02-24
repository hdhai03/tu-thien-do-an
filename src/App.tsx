import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CampaignDetail from "./pages/CampaignDetail";
import Campaigns from "./pages/Campaigns";
import Organizations from "./pages/Organizations";
import Transparency from "./pages/Transparency";
import Login from "./pages/Login";
import DonationHistory from "./pages/DonationHistory";
import Register from "./pages/Register";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import { AuthProvider } from "./context/AuthContext";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import Community from "./pages/Community";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="du-an" element={<Campaigns />} />
            <Route path="to-chuc" element={<Organizations />} />
            <Route path="minh-bach" element={<Transparency />} />
            <Route path="tin-tuc" element={<News />} />
            <Route path="tin-tuc/:id" element={<NewsDetail />} />
            <Route path="ho-so" element={<Profile />} />
            <Route path="dang-nhap" element={<Login />} />
            <Route path="dang-ky" element={<Register />} />
            <Route path="lich-su-quyen-gop" element={<DonationHistory />} />
            <Route path="du-an/:id" element={<CampaignDetail />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="organization" element={<OrganizationDashboard />} />
            <Route path="cong-dong" element={<Community />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
