import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./home";
import Login from "./signin";
import Lobby from "./lobby";
import Profile from "./profile";
import About from "./about";
import Jobs from "./jobs";
import Contact from "./contact";
import Help from "./help";
import Privacy from "./privacy";
import Terms from "./terms";
import ChangeEmailOrPassword from "./changeEmailOrPassword";
import { DebugProvider } from "./DebugContext";
import { NavigationHistoryProvider } from "./NavigationHistoryContext";

function App() {
    return (
        <DebugProvider>
            <BrowserRouter>
                <NavigationHistoryProvider>
                    <Routes>
                        <Route path="/" element={<Navigate replace to="/lobby" />} />
                        <Route path="/lobby" element={<Lobby />} />
                        <Route path="/home" element={<Home />} />
                        <Route path="/signin" element={<Login />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/jobs" element={<Jobs />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/change_email_or_pw" element={<ChangeEmailOrPassword />} />
                    </Routes>
                </NavigationHistoryProvider>
            </BrowserRouter>
        </DebugProvider>
    );
}

export default App;