import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import CreateAdPage from "./pages/CreateAdPage";
import PrivateRoute from "./components/PrivateRoute";
import AdminDashboard from "./pages/AdminDashboard";
import AdPageLayout from "./pages/AdPageLayout";
import AdStats from "./pages/AdStats";

const IS_LOCAL_ADMIN = import.meta.env.VITE_IS_LOCAL_ADMIN === "true";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/ad/new"
        element={
          <PrivateRoute>
            <CreateAdPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/create"
        element={
          <PrivateRoute>
            <CreateAdPage />
          </PrivateRoute>
        }
      />

      {IS_LOCAL_ADMIN && (
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
      )}

      {/* ✅ Вложенные роуты кампаний */}
      <Route
        path="/ad/:adId"
        element={
          <PrivateRoute>
            <AdPageLayout />
          </PrivateRoute>
        }
      >
        <Route path="info" element={<CreateAdPage />} />
        <Route path="stats" element={<AdStats />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
