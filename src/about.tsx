import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";

/**
 * @route /about
 */
export default function About() {
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
                <h1>About TransVerse</h1>

                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <h2>Our Mission</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        TransVerse is focused on delivering multiplayer multilanguage games and educational tools with built-in translation features.
                        We believe that language barriers should never prevent players from enjoying games together
                        and forming meaningful connections across cultures.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Our Progress</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        TransVerse is in the launch stage in late 2025, and expects to scale up in 2026.
                        We are excited to bring our vision of truly global, accessible gaming and educational experiences to
                        players around the world.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Our Technology</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Our secure platform leverages cutting-edge translation technology to provide real-time
                        communication between players speaking different languages in any country, making multiplayer gaming
                        truly universal.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
