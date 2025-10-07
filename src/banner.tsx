import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { app } from "./firebase";
import { getParentPage } from "./siteMap";

interface BannerProps {
    user: any;
}

export default function Banner({ user }: BannerProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (user) {
            // Load profile from localStorage
            const storedProfile = localStorage.getItem("userProfile");
            if (storedProfile) {
                const parsedProfile = JSON.parse(storedProfile);
                setProfile(parsedProfile);
            } else {
                // Fallback: set username to email if no profile
                setProfile({ username: user.email });
            }
        } else {
            setProfile(null);
        }
    }, [user]);

    const handleMenuAction = (action: string) => {
        switch (action) {
            case "signup":
                navigate("/login");
                break;
            case "logout":
                // Just navigate to login page, signout happens there automatically
                navigate("/login");
                break;
            case "exit":
                const parentPage = getParentPage(location.pathname);
                navigate(parentPage);
                break;
            case "home":
                navigate("/home");
                break;
            case "profile":
                navigate("/profile");
                break;
            case "lobby":
                navigate("/lobby");
                break;
        }
    };

    return (
        <div
            style={{
                backgroundColor: "#1a73e8",
                color: "white",
                padding: "15px 30px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
            }}
        >
            {/* Logo at left */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer"
                }}
                onClick={() => navigate("/")}
            >
                <img
                    src="/hub_icon_300.jpg"
                    alt="Fb-Hub Logo"
                    style={{
                        height: "40px",
                        width: "40px",
                        objectFit: "contain"
                    }}
                />
                <span style={{ fontSize: "24px", fontWeight: "bold" }}>
                    Fb-Hub -- {location.pathname.substring(1) || "unknown"}
                </span>
            </div>

            {/* User info and exit button at right */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                {user && (
                    <>
                        {/* User icon */}
                        <div
                            onClick={() => navigate("/profile")}
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "#fff",
                                color: "#1a73e8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "20px",
                                fontWeight: "bold",
                                cursor: "pointer"
                            }}
                        >
                            {profile?.username?.charAt(0).toUpperCase() || "U"}
                        </div>

                        {/* Username */}
                        <div
                            onClick={() => navigate("/profile")}
                            style={{ fontSize: "16px", cursor: "pointer" }}
                        >
                            {profile?.username || "User"}
                        </div>
                    </>
                )}

                {/* Page dropdown */}
                <select
                    onChange={(e) => {
                        if (e.target.value) {
                            handleMenuAction(e.target.value);
                            e.target.value = "Page..."; // Reset to default
                        }
                    }}
                    defaultValue="Page..."
                    style={{
                        padding: "8px 20px",
                        backgroundColor: "#d32f2f",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "500",
                    }}
                >
                    <option value="Page..." disabled>Page...</option>
                    {user ? (
                        // Authenticated user menu
                        <>
                            <option value="home">Home</option>
                            <option value="lobby">Lobby</option>
                            <option value="profile">Profile</option>
                            {getParentPage(location.pathname) !== "/login" && (
                                <option value="exit">Exit (Back)</option>
                            )}
                            <option value="logout">Logout</option>
                        </>
                    ) : (
                        // Unauthenticated user menu
                        <option value="signup">SignUp</option>
                    )}
                </select>
            </div>
        </div>
    );
}
