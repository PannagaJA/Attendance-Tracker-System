import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ParallaxProvider } from "react-scroll-parallax";
import { UserProvider } from "./contexts/UserContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ChooseSemesterPage from "./pages/ChooseSemesterPage";
import OptionsPage from "./pages/OptionsPage";
import EnrollPage from "./pages/EnrollPage";
import TakeAttendancePage from "./pages/TakeAttendancePage";
import AttendanceStatisticsPage from "./pages/AttendanceStatisticsPage";
import StudentDashboard from "./pages/StudentDashboard";
import HODDashboard from "./pages/HODDashboard";

const MainContent = () => {
  const location = useLocation();
  const showNavbarRoutes = ['/', '/about', '/contact'];

  return (
    <div className="min-h-screen bg-gray-100">
      {showNavbarRoutes.includes(location.pathname) && <Navbar />} {/* Conditionally render Navbar */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/choose-semester"
          element={<ProtectedRoute><ChooseSemesterPage /></ProtectedRoute>}
        />
        <Route
          path="/options"
          element={<ProtectedRoute><OptionsPage /></ProtectedRoute>}
        />
        <Route
          path="/enroll"
          element={<ProtectedRoute><EnrollPage /></ProtectedRoute>}
        />
        <Route
          path="/take-attendance"
          element={<ProtectedRoute><TakeAttendancePage /></ProtectedRoute>}
        />
        <Route
          path="/attendance-statistics"
          element={<ProtectedRoute><AttendanceStatisticsPage /></ProtectedRoute>}
        />
        <Route
          path="/student-dashboard"
          element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>}
        />
        <Route
          path="/hod-dashboard"
          element={<ProtectedRoute><HODDashboard /></ProtectedRoute>}
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <UserProvider>
      <ParallaxProvider>
        <Router>
          <MainContent />
        </Router>
      </ParallaxProvider>
    </UserProvider>
  );
};

export default App;
