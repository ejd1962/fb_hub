import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { app } from "./firebase";
import { getParentPage } from "./siteMap";
import { useDebug } from "./DebugContext";
import { ALLOW_DEBUG } from "./constants";
import { useNavigationHistory } from "./NavigationHistoryContext";




interface BannerProps {
    user: any;
}

export default function Banner({ user }: BannerProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState<any>(null);
    const { DEBUG, setDEBUG } = useDebug();
    const { goBack, getLastPage } = useNavigationHistory();
    const db = getFirestore(app);

    useEffect(() => {
        const loadProfile = async () => {
            if (user) {
                // Load from localStorage first (instant display, no layout shift)
                const cachedProfile = localStorage.getItem("userProfile");
                if (cachedProfile) {
                    setProfile(JSON.parse(cachedProfile));
                }

                // Then sync from Firestore in background to ensure fresh data
                try {
                    const profileDoc = await getDoc(doc(db, "profile", user.uid));
                    if (profileDoc.exists()) {
                        const profileData = profileDoc.data();
                        setProfile(profileData);
                        // Update cache
                        localStorage.setItem("userProfile", JSON.stringify(profileData));
                    } else {
                        // Fallback: set username to email if no profile document exists
                        const fallbackProfile = { username: user.email };
                        setProfile(fallbackProfile);
                        localStorage.setItem("userProfile", JSON.stringify(fallbackProfile));
                    }
                } catch (error) {
                    console.error("Error loading profile in banner:", error);
                    // Keep cached profile if Firestore fails
                    if (!cachedProfile) {
                        const fallbackProfile = { username: user.email };
                        setProfile(fallbackProfile);
                    }
                }
            } else {
                setProfile(null);
            }
        };

        loadProfile();
    }, [user, db]);

    const handleMenuAction = (action: string) => {
        switch (action) {
            case "signup":
                navigate("/signin");
                break;
            case "logout":
                // Just navigate to login page, signout happens there automatically
                navigate("/signin");
                break;
            case "back":
                const backPage = goBack();
                if (backPage) {
                    navigate(backPage);
                }
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
            case "welcome":
                navigate("/welcome");
                break;
        }
    };

    return (
        <div
            style={{
                backgroundColor: "#e67e22",
                color: "white",
                paddingTop: "5px",
                paddingBottom: "5px",
                paddingLeft: "20px",
                paddingRight: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "10px"
            }}
        >
            {/* Logo at left */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "0",
                    margin: "0"
                }}
                onClick={() => navigate("/")}
            >
                <img
                    src="TransVerse_logo_with_label_to_right_with_tan_background.jpg"
                    alt="TransVerse Hub Logo"
                    className="banner-logo"
                    style={{
                        height: "40px",
                        width: "200px",
                        objectFit: "contain",
                        margin: "0",
                        marginLeft: "-15px",
                        padding: "0",
                        display: "block"
                    }}
                />
                <span className="banner-page-name" style={{ fontSize: "16px", fontWeight: "bold" }}>
                    Page: {location.pathname.substring(1) || "unknown"}
                </span>
            </div>

            {/* User info and exit button at right */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {user && (
                    <>
                        {/* Debug Slider - only show if ALLOW_DEBUG is true */}
                        {ALLOW_DEBUG && (
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "500" }}>DEBUG</span>
                                <label style={{
                                    position: "relative",
                                    display: "inline-block",
                                    width: "40px",
                                    height: "20px",
                                    cursor: "pointer"
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={DEBUG}
                                        onChange={(e) => setDEBUG(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: DEBUG ? "#4caf50" : "#ccc",
                                        borderRadius: "20px",
                                        transition: "0.3s"
                                    }}>
                                        <span style={{
                                            position: "absolute",
                                            content: '""',
                                            height: "14px",
                                            width: "14px",
                                            left: DEBUG ? "23px" : "3px",
                                            bottom: "3px",
                                            backgroundColor: "white",
                                            borderRadius: "50%",
                                            transition: "0.3s"
                                        }} />
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* User icon */}
                        <div
                            onClick={() => navigate("/profile")}
                            className="banner-user-icon"
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: profile?.userColor || "#2563eb",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "16px",
                                fontWeight: "bold",
                                cursor: "pointer"
                            }}
                        >
                            {profile?.username?.charAt(0).toUpperCase() || "U"}
                        </div>

                        {/* Username */}
                        <div
                            onClick={() => navigate("/profile")}
                            className="banner-username"
                            style={{ fontSize: "14px", cursor: "pointer" }}
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
                            e.target.value = ""; // Reset to default
                        }
                    }}
                    defaultValue=""
                    style={{
                        padding: "6px 12px",
                        backgroundColor: "#d2b48c",
                        color: "black",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                    }}
                >
                    <option value="" disabled>Go To...</option>
                    {user ? (
                        // Authenticated user menu
                        <>
                            {(() => {
                                const lastPage = getLastPage();
                                if (lastPage) {
                                    return <option value="back">Back ({lastPage})</option>;
                                } else {
                                    return <option value="back" disabled>Back</option>;
                                }
                            })()}
                            <option value="welcome" disabled={location.pathname === "/welcome"}>Welcome</option>
                            <option value="home" disabled={location.pathname === "/home"}>Home</option>
                            <option value="lobby" disabled={location.pathname === "/lobby"}>Lobby</option>
                            <option value="profile" disabled={location.pathname === "/profile"}>Profile</option>
                            <option value="logout">Logout</option>
                        </>
                    ) : (
                        // Unauthenticated user menu
                        <>
                            <option value="welcome" disabled={location.pathname === "/welcome"}>Welcome</option>
                            <option value="lobby" disabled={location.pathname === "/lobby"}>Lobby</option>
                            <option value="signup" disabled={location.pathname === "/signin"}>SignUp</option>
                        </>
                    )}
                </select>
            </div>
        </div>
    );
}
