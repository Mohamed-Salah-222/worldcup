import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "@/components/AdminRoute";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { MatchesPage } from "@/pages/MatchesPage";
import { MyPredictionsPage } from "@/pages/MyPredictionsPage";
import { RegisterPage } from "@/pages/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MatchesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/my-predictions" element={<MyPredictionsPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
import { AdminPage } from "@/pages/AdminPage";
