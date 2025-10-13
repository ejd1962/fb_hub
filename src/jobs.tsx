import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";

/**
 * @route /jobs
 */
export default function Jobs() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Banner user={user} />
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", flex: "1" }}>
                <h1>Jobs at TransVerse</h1>

                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <h2>Current Openings</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Thank you for your interest in joining the TransVerse team. We appreciate your
                        enthusiasm and the time you've taken to explore career opportunities with us.
                    </p>

                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333", marginTop: "20px" }}>
                        At this time, TransVerse is not hiring employees or contractors. As we are in our
                        launch stage, we are operating with a lean core team focused on building and refining
                        our platform.
                    </p>

                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333", marginTop: "20px" }}>
                        As we grow and scale up in 2026, we anticipate opening positions across various
                        disciplines including game development, software engineering, translation services,
                        and community management. We encourage you to check back in the future for updates
                        on career opportunities.
                    </p>

                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333", marginTop: "20px" }}>
                        Thank you again for your interest in TransVerse.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
