import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Banner from "./banner";
import Footer from "./footer";
import { app } from "./firebase";

/**
 * @route /privacy
 */
export default function Privacy() {
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
                <h1>Privacy Policy</h1>

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

                    <h2>Introduction</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        TransVerse ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
                        explains how we collect, use, disclose, and safeguard your information when you use our
                        platform and services.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Information We Collect</h2>
                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>Personal Information</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We collect information you provide directly to us, including:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li>Email address</li>
                        <li>Username</li>
                        <li>Profile information (first name, last name, country, language preference, age, gender)</li>
                        <li>Game activity and gameplay data</li>
                        <li>Communications with us</li>
                    </ul>

                    <h3 style={{ fontSize: "18px", marginTop: "20px" }}>Automatically Collected Information</h3>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        When you use our services, we automatically collect certain information, including:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li>Device information and IP address</li>
                        <li>Browser type and version</li>
                        <li>Usage data and interactions with our platform</li>
                        <li>Cookies and similar tracking technologies</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>How We Use Your Information</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We use the information we collect to:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li>Provide, maintain, and improve our services</li>
                        <li>Create and manage your account</li>
                        <li>Enable gameplay and multiplayer features</li>
                        <li>Provide translation services during gameplay</li>
                        <li>Communicate with you about updates, security alerts, and support</li>
                        <li>Monitor and analyze usage patterns</li>
                        <li>Enforce our Terms of Service</li>
                        <li>Protect against fraud and unauthorized access</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>Information Sharing</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We do not sell your personal information. We may share your information in the following circumstances:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li><strong>With Other Players:</strong> Your username and basic profile information may be visible to other players during gameplay. We do not share any information with other players that lets them identify you individually or contact you outside the TransVerse environment. Email addresses are not shared. But please note, your first name and the first initial of your last name are shared, along with your age, gender, language, and country, and username.</li>
                        <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf</li>
                        <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
                        <li><strong>Business Transfers:</strong> Information may be transferred in connection with a merger, sale, or acquisition</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>Data Security</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We implement appropriate technical and organizational measures to protect your personal information.
                        However, no method of transmission over the internet is 100% secure, and we cannot guarantee
                        absolute security.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Your Rights</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        You have the right to:
                    </p>
                    <ul style={{ fontSize: "16px", lineHeight: "1.8", color: "#333" }}>
                        <li>Access and update your personal information</li>
                        <li>Delete your account</li>
                        <li>Opt out of certain data collection</li>
                        <li>Request a copy of your data</li>
                    </ul>

                    <h2 style={{ marginTop: "30px" }}>Children's Privacy</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        Some of our games may have age restrictions. We do not knowingly collect personal information
                        from children under the minimum age specified for each game without parental consent.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Changes to This Policy</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        We may update this Privacy Policy from time to time. We will notify you of any changes by
                        posting the new Privacy Policy on this page and updating the "Last Updated" date.
                    </p>

                    <h2 style={{ marginTop: "30px" }}>Contact Us</h2>
                    <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
                        If you have questions about this Privacy Policy, please contact us at{" "}
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
