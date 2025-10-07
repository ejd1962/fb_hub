import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import "./App.css";
import { app } from "./firebase";
import Banner from "./banner";

export default function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState(false);

    useEffect(() => {
        console.log("HOME PAGE - Setting up auth listener");
        const unsubscribe = onAuthStateChanged(getAuth(app), (user) => {
            console.log("HOME PAGE - Auth state changed:", user);
            console.log("HOME PAGE - User email:", user?.email);
            console.log("HOME PAGE - User UID:", user?.uid);
            if (!user) {
                console.log("HOME PAGE - No user, redirecting to /login");
                navigate("/login");
                setUser(false);
                console.log("I am on home.tsx page, but login failed.  there is no user due to authentication failure.");
            } else {
                console.log("HOME PAGE - User authenticated, setting user state to true");
                setUser(true);
            }
        });

        return () => {
            console.log("HOME PAGE - Cleaning up auth listener");
            unsubscribe();
        };
    }, [navigate]);

    function handleClick() {
        const auth = getAuth(app);
        auth.signOut();
    }
    console.log(user);

    return (
        <div>
            <Banner user={getAuth(app).currentUser} />
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
                <h1>Welcome to Your Account</h1>

            <div style={{ margin: "20px 0", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                <h2>Account Information</h2>
                {user ? (
                    <div>
                        <p><strong>Email:</strong> {getAuth(app).currentUser?.email}</p>
                        <p><strong>User ID:</strong> {getAuth(app).currentUser?.uid}</p>
                        <p><strong>Email Verified:</strong> {getAuth(app).currentUser?.emailVerified ? "Yes" : "No"}</p>
                    </div>
                ) : (
                    <p>Loading account information...</p>
                )}
            </div>

            <div style={{ margin: "20px 0", padding: "20px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                <h2>News & Updates</h2>
                <p>🎮 Welcome to the Gaming Hub! Check out our latest games in the lobby.</p>
                <p>📢 New games added weekly - stay tuned!</p>
                <p>🏆 Join our community and compete with players worldwide.</p>
            </div>

            </div>
        </div>
    );

}