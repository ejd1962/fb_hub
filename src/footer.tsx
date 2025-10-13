import { useNavigate } from "react-router-dom";

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer
            style={{
                backgroundColor: "#ec9c4d",
                color: "white",
                padding: "15px 20px",
                marginTop: "40px"
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "20px"
                }}
            >
                {/* Left Side - Company, Support, and Copyright */}
                <div style={{ flex: "1" }}>
                    {/* Company Section - Single Line */}
                    <div style={{ marginBottom: "8px", fontSize: "16px" }}>
                        <span style={{ fontWeight: "bold" }}>Company:</span>
                        {" "}
                        <span
                            onClick={() => navigate("/about")}
                            style={{
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            About Us
                        </span>
                        {", "}
                        <span
                            onClick={() => navigate("/jobs")}
                            style={{
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Jobs
                        </span>
                        {", "}
                        <span
                            onClick={() => navigate("/contact")}
                            style={{
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Contact Us
                        </span>
                    </div>

                    {/* Support Section - Single Line */}
                    <div style={{ marginBottom: "8px", fontSize: "16px" }}>
                        <span style={{ fontWeight: "bold" }}>Support:</span>
                        {" "}
                        <span
                            onClick={() => navigate("/help")}
                            style={{
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Help Center
                        </span>
                        {", "}
                        <span
                            onClick={() => navigate("/privacy")}
                            style={{
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Privacy Policy
                        </span>
                        {", "}
                        <span
                            onClick={() => navigate("/terms")}
                            style={{
                                color: "white",
                                textDecoration: "none",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            Terms of Service
                        </span>
                    </div>

                    {/* Copyright Section */}
                    <div style={{ fontSize: "12px" }}>
                        &copy; {new Date().getFullYear()} TransVerse. All rights reserved.
                    </div>
                </div>

                {/* Right Side - Follow Us */}
                <div style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: "8px", fontSize: "16px", fontWeight: "bold" }}>Follow Us:</div>
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                window.open(e.target.value, "_blank", "noopener,noreferrer");
                                e.target.value = ""; // Reset dropdown
                            }
                        }}
                        defaultValue=""
                        className="footer-dropdown"
                        style={{
                            padding: "5px 10px",
                            backgroundColor: "#d2b48c",
                            color: "black",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            width: "150px"
                        }}
                    >
                        <option value="" disabled>Select Platform</option>
                        <option value="https://twitter.com">Twitter</option>
                        <option value="https://facebook.com">Facebook</option>
                        <option value="https://instagram.com">Instagram</option>
                        <option value="https://linkedin.com">LinkedIn</option>
                    </select>
                </div>
            </div>
        </footer>
    );
}
