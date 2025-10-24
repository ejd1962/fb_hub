import { getAuth, onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import "./App.css";
import { app } from "./firebase";
import Banner from "./banner";
import Footer from "./footer";

/**
 * @route /home
 */
export default function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState(false);
    const [username, setUsername] = useState("");
    const [sendingVerification, setSendingVerification] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState("");
    const db = getFirestore(app);

    useEffect(() => {
        console.log("HOME PAGE - Setting up auth listener");
        const unsubscribe = onAuthStateChanged(getAuth(app), async (currentUser) => {
            console.log("HOME PAGE - Auth state changed:", currentUser);
            console.log("HOME PAGE - User email:", currentUser?.email);
            console.log("HOME PAGE - User UID:", currentUser?.uid);
            if (!currentUser) {
                console.log("HOME PAGE - No user, redirecting to /login");
                navigate("/signin");
                setUser(false);
                console.log("I am on home.tsx page, but login failed.  there is no user due to authentication failure.");
            } else {
                console.log("HOME PAGE - User authenticated, setting user state to true");
                setUser(true);

                // Load username from localStorage first, then sync from Firestore
                const cachedProfile = localStorage.getItem("userProfile");
                if (cachedProfile) {
                    setUsername(JSON.parse(cachedProfile).username || "");
                }

                // Sync from Firestore
                try {
                    const profileDoc = await getDoc(doc(db, "profile", currentUser.uid));
                    if (profileDoc.exists()) {
                        const profileData = profileDoc.data();
                        setUsername(profileData.username || "");
                        // Update cache
                        localStorage.setItem("userProfile", JSON.stringify(profileData));
                    }
                } catch (error) {
                    console.error("Error loading username:", error);
                }
            }
        });

        return () => {
            console.log("HOME PAGE - Cleaning up auth listener");
            unsubscribe();
        };
    }, [navigate, db]);

    // function handleClick() {
    //     const auth = getAuth(app);
    //     auth.signOut();
    // }

    const handleResendVerification = async () => {
        const currentUser = getAuth(app).currentUser;
        if (!currentUser) return;

        setSendingVerification(true);
        setVerificationMessage("");

        try {
            await sendEmailVerification(currentUser);
            setVerificationMessage("Verification email sent! Please check your inbox.");
            setTimeout(() => setVerificationMessage(""), 5000);
        } catch (error: any) {
            console.error("Error sending verification email:", error);
            setVerificationMessage("Error: " + error.message);
        } finally {
            setSendingVerification(false);
        }
    };

    console.log(user);

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Banner user={getAuth(app).currentUser} />
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", paddingTop: "0", paddingBottom: "10px", flex: "1" }}>
                <h1 className="page-title">Welcome to Your Account</h1>

                <button
                    onClick={() => navigate("/lobby")}
                    style={{
                        backgroundColor: "#e67e22",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "12px 24px",
                        fontSize: "16px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        marginBottom: "20px",
                        transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#c0611f"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#e67e22"}
                >
                    Go To Lobby
                </button>

            <div style={{ margin: "20px 0", padding: "10px 20px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                <h2>News & Updates</h2>
                <p>🎮 Welcome to the TransVerse Hub! Check out our latest games in the lobby.</p>
                <p>📢 New games added weekly - stay tuned!</p>
                <p>🏆 Join our community and compete with players worldwide.</p>
            </div>

            <div style={{ margin: "20px 0", padding: "10px 20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                <h2>Account Information</h2>
                {user ? (
                    <div>
                        <p><strong>User ID:</strong> {getAuth(app).currentUser?.uid}</p>
                        <p><strong>Username:</strong> {username || "Loading..."}</p>
                        <p><strong>Email:</strong> {getAuth(app).currentUser?.email}</p>
                        <p style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span><strong>Email Verified:</strong> {getAuth(app).currentUser?.emailVerified ? "Yes" : "No"}</span>
                            {!getAuth(app).currentUser?.emailVerified && (
                                <button
                                    onClick={handleResendVerification}
                                    disabled={sendingVerification}
                                    style={{
                                        padding: "6px 12px",
                                        fontSize: "12px",
                                        backgroundColor: sendingVerification ? "#ccc" : "#e67e22",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: sendingVerification ? "not-allowed" : "pointer",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {sendingVerification ? "SENDING..." : "RESEND VERIFICATION EMAIL"}
                                </button>
                            )}
                        </p>
                        {verificationMessage && (
                            <p style={{
                                color: verificationMessage.includes("Error") ? "#c62828" : "#2e7d32",
                                fontSize: "14px",
                                fontWeight: "500",
                                marginTop: "5px"
                            }}>
                                {verificationMessage}
                            </p>
                        )}
                        <p style={{ marginTop: "15px" }}>
                            <span
                                onClick={() => navigate("/profile")}
                                style={{
                                    color: "#e67e22",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    fontWeight: "500"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "#c0611f"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "#e67e22"}
                            >
                                Review or Update User Profile
                            </span>
                        </p>
                        <p style={{ marginTop: "10px" }}>
                            <span
                                onClick={() => navigate("/change_email_or_pw")}
                                style={{
                                    color: "#e67e22",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    fontWeight: "500"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "#c0611f"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "#e67e22"}
                            >
                                Update Password or Email
                            </span>
                        </p>
                    </div>
                ) : (
                    <p>Loading account information...</p>
                )}
            </div>

            </div>
            <Footer />
        </div>
    );

}