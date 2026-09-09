import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import SideBar from "./componets/ui-componets/side-bar";
import LoginPage from "./pages/login/page";
import SignupPage from "./pages/signup/page";
import ForgetPasswordPage from "./pages/forget-password/page";

function App() {
  const location = useLocation(); // Forces re-render on route changes
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forget-password" element={<ForgetPasswordPage />} />
      <Route 
        path="/*" 
        element={
          isAuthenticated ? (
            <SideBar />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
  );
}

export default App;