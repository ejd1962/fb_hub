import { getAuth, onAuthStateChanged, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendEmailVerification } from "firebase/auth";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "./firebase";
import Banner from "./banner";
import Footer from "./footer";

/**
 * @route /change_email_or_pw
 */
export default function ChangeEmailOrPassword() {
    const [user, setUser] = useState<any>(null);
    const [isEmailPasswordUser, setIsEmailPasswordUser] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const db = getFirestore(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), (currentUser) => {
            if (!currentUser) {
                navigate("/signin");
            } else {
                setUser(currentUser);
                // Check if user signed in with email/password
                const hasPasswordProvider = currentUser.providerData.some(
                    (provider) => provider.providerId === "password"
                );
                setIsEmailPasswordUser(hasPasswordProvider);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const reauthenticate = async () => {
        const auth = getAuth(app);
        const user = auth.currentUser;

        if (!user || !user.email) {
            throw new Error("No user is currently signed in");
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
    };

    const handleChangeEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        try {
            // Reauthenticate first
            await reauthenticate();

            // Update email in Firebase Auth
            const auth = getAuth(app);
            if (auth.currentUser) {
                await updateEmail(auth.currentUser, newEmail);

                // Send verification email to new address
                try {
                    await sendEmailVerification(auth.currentUser);
                    console.log("Verification email sent to:", newEmail);
                } catch (verificationError) {
                    console.error("Error sending verification email:", verificationError);
                    // Continue even if verification email fails
                }

                // Update email in profile document
                try {
                    const profileRef = doc(db, "profile", auth.currentUser.uid);
                    await updateDoc(profileRef, {
                        email: newEmail,
                        updatedAt: new Date().toISOString()
                    });
                    console.log("Profile email updated in Firestore");
                } catch (profileError) {
                    console.error("Error updating profile email:", profileError);
                    // Don't fail the whole operation if profile update fails
                }

                setMessage(`Email updated successfully! A verification email has been sent to ${newEmail}. Please check your inbox and verify your new email address.`);
                setNewEmail("");
                setCurrentPassword("");
            }
        } catch (error: any) {
            console.error("Error updating email:", error);
            setError(error.message || "Failed to update email. Please check your current password.");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);

        try {
            // Reauthenticate first
            await reauthenticate();

            // Update password
            const auth = getAuth(app);
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, newPassword);
                setMessage("Password updated successfully!");
                setNewPassword("");
                setConfirmPassword("");
                setCurrentPassword("");
            }
        } catch (error: any) {
            console.error("Error updating password:", error);
            setError(error.message || "Failed to update password. Please check your current password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Banner user={user} />
            <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", flex: "1" }}>
                <h1>Change Email or Password</h1>

                {message && (
                    <div
                        style={{
                            padding: "10px",
                            marginBottom: "20px",
                            backgroundColor: "#e8f5e9",
                            color: "#2e7d32",
                            borderRadius: "4px",
                            border: "1px solid #2e7d32"
                        }}
                    >
                        {message}
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            padding: "10px",
                            marginBottom: "20px",
                            backgroundColor: "#ffebee",
                            color: "#c62828",
                            borderRadius: "4px",
                            border: "1px solid #c62828"
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Change Email Section */}
                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <h2>Change Email</h2>
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
                        Current email: <strong>{user?.email}</strong>
                    </p>

                    {!isEmailPasswordUser && (
                        <div style={{
                            padding: "15px",
                            backgroundColor: "#fff3e0",
                            color: "#e65100",
                            borderRadius: "4px",
                            marginBottom: "20px",
                            border: "1px solid #e65100"
                        }}>
                            You signed in with Google. Email changes for Google accounts must be made through your Google account settings.
                        </div>
                    )}

                    {isEmailPasswordUser && (
                        <form onSubmit={handleChangeEmail}>
                            <div style={{ marginBottom: "15px" }}>
                                <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                                    Current Password (required)
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        fontSize: "16px",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px"
                                    }}
                                />
                            </div>

                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                                New Email
                            </label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "16px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px"
                                }}
                            />
                        </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: "12px 24px",
                                    fontSize: "16px",
                                    backgroundColor: loading ? "#ccc" : "#e67e22",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? "Updating..." : "Update Email"}
                            </button>
                        </form>
                    )}
                </div>

                {/* Change Password Section - Only for email/password users */}
                {isEmailPasswordUser && (
                <div style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    border: "3px solid #000",
                    marginBottom: "20px"
                }}>
                    <h2>Change Password</h2>

                    <form onSubmit={handleChangePassword}>
                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                                Current Password (required)
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "16px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px"
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "16px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px"
                                }}
                            />
                            <small style={{ color: "#666" }}>Must be at least 6 characters</small>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "16px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px"
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: "12px 24px",
                                fontSize: "16px",
                                backgroundColor: loading ? "#ccc" : "#e67e22",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>
                )}

                {/* Message for Google users about password */}
                {!isEmailPasswordUser && (
                    <div style={{
                        backgroundColor: "white",
                        padding: "30px",
                        borderRadius: "8px",
                        border: "3px solid #000",
                        marginBottom: "20px"
                    }}>
                        <h2>Password Management</h2>
                        <div style={{
                            padding: "15px",
                            backgroundColor: "#e3f2fd",
                            color: "#1565c0",
                            borderRadius: "4px",
                            border: "1px solid #1565c0"
                        }}>
                            You signed in with Google. Password management is handled through your Google account.
                            To change your Google password, please visit{" "}
                            <a
                                href="https://myaccount.google.com/security"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#1565c0", fontWeight: "bold", textDecoration: "underline" }}
                            >
                                Google Account Security
                            </a>.
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
