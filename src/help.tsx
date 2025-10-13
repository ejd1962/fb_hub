import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";

/**
 * @route /help
 */
export default function Help() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh" }}>
            <Banner user={user} />
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
                <h1>Help Center</h1>

                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <h2>Getting Started</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Welcome to TransVerse! Here are some quick tips to get you started:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li><strong>Create an Account:</strong> Sign up using your email or Google account</li>
                        <li><strong>Complete Your Profile:</strong> Add your username, language preference, and other details</li>
                        <li><strong>Browse Games:</strong> Visit the Lobby to see available games and activities</li>
                        <li><strong>Join a Game:</strong> Click "PLAY NOW" on any game to start playing</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>Account Management</h2>
                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>How do I reset my password?</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        On the login page, click "Forgot Password" and follow the instructions sent to your email.
                    </p>

                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>How do I update my profile?</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Navigate to your Profile page from the dropdown menu in the banner. You can update your
                        username, language preference, country, age, and other details.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Gameplay</h2>
                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>How does the translation feature work?</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Our platform automatically translates messages between players in real-time based on their
                        language preferences, allowing seamless communication across language barriers.
                    </p>

                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>What are the age restrictions?</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Some games have minimum age requirements. Check each game's information panel in the Lobby
                        for specific age restrictions.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Technical Support</h2>
                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>The game won't load. What should I do?</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Try refreshing your browser, clearing your cache, or using a different browser. Make sure
                        you're signed in and have a stable internet connection.
                    </p>

                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>I'm having connection issues.</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Check your internet connection. Our games require a stable connection for the best experience.
                        If problems persist, try restarting your browser or device.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Still Need Help?</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        If you can't find the answer you're looking for, please contact us at{" "}
                        <a
                            href="mailto:000transverse@gmail.com"
                            style={{ color: "#e67e22", textDecoration: "none" }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            000transverse@gmail.com
                        </a>
                        . We typically respond within 2-3 business days.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
