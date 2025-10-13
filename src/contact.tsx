import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";

export default function Contact() {
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
                <h1>Contact Us</h1>

                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <h2>Get in Touch</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We'd love to hear from you! Whether you have questions about our platform,
                        feedback about your gaming experience, or inquiries about partnerships,
                        please don't hesitate to reach out.
                    </p>

                    <div style={{
                        marginTop: "30px",
                        padding: "20px",
                        backgroundColor: "#ffe5cc",
                        borderRadius: "4px",
                        border: "1px solid #e67e22"
                    }}>
                        <h3 style={{ marginTop: "0", color: "#e67e22" }}>Email</h3>
                        <p style={{ fontSize: "18px", margin: "0" }}>
                            <a
                                href="mailto:000transverse@gmail.com"
                                style={{
                                    color: "#e67e22",
                                    textDecoration: "none",
                                    fontWeight: "500"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                            >
                                000transverse@gmail.com
                            </a>
                        </p>
                    </div>

                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333", marginTop: "30px" }}>
                        We aim to respond to all inquiries within 2-3 business days. Thank you for your
                        interest in TransVerse!
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
