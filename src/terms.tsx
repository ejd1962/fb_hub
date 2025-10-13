import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";

export default function Terms() {
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
                <h1>Terms of Service</h1>

                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
                        <strong>Last Updated:</strong> December 2025
                    </p>

                    <h2>Acceptance of Terms</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        By accessing or using TransVerse ("the Service"), you agree to be bound by these Terms of Service
                        ("Terms"). If you do not agree to these Terms, please do not use the Service.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Account Registration</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        To use certain features of the Service, you must register for an account. You agree to:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li>Provide accurate and complete information</li>
                        <li>Maintain the security of your account credentials</li>
                        <li>Notify us immediately of any unauthorized access</li>
                        <li>Be responsible for all activities under your account</li>
                        <li>Not share your account with others</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>Age Requirements</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        You must meet the minimum age requirement for each game or activity. Some games may have
                        specific age restrictions. It is your responsibility to comply with these requirements.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>User Conduct</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        You agree not to:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li>Violate any applicable laws or regulations</li>
                        <li>Harass, threaten, or abuse other users</li>
                        <li>Use offensive, discriminatory, or inappropriate language</li>
                        <li>Cheat, hack, or exploit bugs in games</li>
                        <li>Impersonate others or misrepresent your identity</li>
                        <li>Spam or send unsolicited messages</li>
                        <li>Interfere with the proper functioning of the Service</li>
                        <li>Attempt to gain unauthorized access to any part of the Service</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>Intellectual Property</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        All content, features, and functionality of the Service, including but not limited to text,
                        graphics, logos, and software, are owned by TransVerse or its licensors and are protected by
                        intellectual property laws. You may not copy, modify, distribute, or create derivative works
                        without our express written permission.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>User Content</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        You retain ownership of any content you submit or transmit through the Service. By submitting
                        content, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and
                        display your content in connection with operating the Service.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Termination</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We reserve the right to suspend or terminate your account at any time for any reason, including
                        violation of these Terms. You may also delete your account at any time through your profile settings.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Disclaimer of Warranties</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                        IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Limitation of Liability</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        TO THE FULLEST EXTENT PERMITTED BY LAW, TRANSVERSE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Governing Law</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        These Terms shall be governed by and construed in accordance with applicable laws, without regard
                        to conflict of law principles.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Changes to Terms</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We may modify these Terms at any time. We will notify you of material changes by posting the
                        updated Terms on this page and updating the "Last Updated" date. Your continued use of the
                        Service after changes constitutes acceptance of the modified Terms.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Contact Us</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        If you have questions about these Terms of Service, please contact us at{" "}
                        <a
                            href="mailto:000transverse@gmail.com"
                            style={{ color: "#e67e22", textDecoration: "none" }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            000transverse@gmail.com
                        </a>
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
