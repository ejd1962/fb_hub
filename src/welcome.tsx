import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";
import { getOrCreateGuestUUID } from "./guestUtils";
import "./App.css";

/**
 * @route /welcome
 */
export default function Welcome() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [, setGuestUUID] = useState<string | null>(null);

    useEffect(() => {
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        setUser(currentUser);

        // If user is not authenticated, assign a guest UUID (only if they don't already have one)
        if (!currentUser) {
            const uuid = getOrCreateGuestUUID();
            setGuestUUID(uuid);
        }
    }, []);

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Banner user={user} />
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", paddingTop: "0", paddingBottom: "10px", flex: "1" }}>
                <h1 className="page-title">Welcome to TransVerse Hub</h1>

                <div style={{ margin: "20px 0", padding: "20px", backgroundColor: "#fff3e0", borderRadius: "8px" }}>
                    <h2 style={{ marginTop: "0" }}>Your Gateway to Online Gaming</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6" }}>
                        TransVerse Hub is your central authentication portal for accessing a variety of exciting online games
                        and interactive experiences. Sign in once and enjoy seamless access to our entire gaming ecosystem.
                    </p>
                </div>

                <div style={{ margin: "20px 0", padding: "20px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                    <h2 style={{ marginTop: "0" }}>Why TransVerse Hub?</h2>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8" }}>
                        <li><strong>Single Sign-On:</strong> One account for all our games</li>
                        <li><strong>Secure Authentication:</strong> Powered by Google Firebase</li>
                        <li><strong>Multiple Login Options:</strong> Email/Password or Google OAuth</li>
                        <li><strong>Growing Library:</strong> New games added regularly</li>
                        <li><strong>Cross-Platform:</strong> Play on any device with a web browser</li>
                    </ul>
                </div>

                <div style={{ margin: "20px 0", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                    <h2 style={{ marginTop: "0" }}>Get Started</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "20px" }}>
                        Ready to join the TransVerse community? Create an account or sign in to start playing!
                    </p>
                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                        <button
                            onClick={() => navigate("/signin")}
                            style={{
                                backgroundColor: "#e67e22",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "12px 24px",
                                fontSize: "16px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#c0611f"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#e67e22"}
                        >
                            Sign In / Sign Up
                        </button>
                        <button
                            onClick={() => navigate("/lobby")}
                            style={{
                                backgroundColor: "#3498db",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "12px 24px",
                                fontSize: "16px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2980b9"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#3498db"}
                        >
                            Browse Games
                        </button>
                    </div>
                </div>

                <div style={{ margin: "20px 0", padding: "20px", backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
                    <h2 style={{ marginTop: "0" }}>Featured Games</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6" }}>
                        Check out our game lobby to see all available games. From word puzzles to multiplayer challenges,
                        there's something for everyone. Visit the lobby to explore our full catalog!
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
