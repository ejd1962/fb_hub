import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "./firebase";
import Banner from "./banner";
import { countries } from "./countries";
import { languages } from "./languages";

export default function Profile() {
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [language, setLanguage] = useState("");
    const [country, setCountry] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const db = getFirestore(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), async (currentUser) => {
            if (!currentUser) {
                navigate("/login");
            } else {
                setUser(currentUser);
                // Load existing profile data
                await loadProfile(currentUser.uid);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const loadProfile = async (uid: string) => {
        try {
            const profileDoc = await getDoc(doc(db, "profile", uid));
            if (profileDoc.exists()) {
                const data = profileDoc.data();
                setFirstName(data.firstName || "");
                setLastName(data.lastName || "");
                setUsername(data.username || "");
                setLanguage(data.language || "");
                setCountry(data.country || "");
                setAge(data.age || "");
                setGender(data.gender || "");
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage("");

        try {
            await setDoc(doc(db, "profile", user.uid), {
                firstName,
                lastName,
                username,
                language,
                country,
                age,
                gender,
                email: user.email,
                updatedAt: new Date().toISOString()
            });

            setMessage("Profile saved successfully!");
            console.log("Profile saved for user:", user.uid);
        } catch (error: any) {
            console.error("Error saving profile:", error);
            setMessage("Error saving profile: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Banner user={user} />
                <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Banner user={user} />
            <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
                <h1>User Profile</h1>

                {message && (
                    <div
                        style={{
                            padding: "10px",
                            marginBottom: "20px",
                            backgroundColor: message.includes("Error") ? "#ffebee" : "#e8f5e9",
                            color: message.includes("Error") ? "#c62828" : "#2e7d32",
                            borderRadius: "4px"
                        }}
                    >
                        {message}
                    </div>
                )}

                <form onSubmit={handleSaveProfile}>
                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                            First Name
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
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
                            Last Name
                        </label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
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
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
                            Language
                        </label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                fontSize: "16px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                            }}
                        >
                            <option value="">Select a language</option>
                            {languages.map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                            Country
                        </label>
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                fontSize: "16px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                            }}
                        >
                            <option value="">Select a country</option>
                            {countries.map((countryName) => (
                                <option key={countryName} value={countryName}>
                                    {countryName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                            Age
                        </label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            min="1"
                            max="120"
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
                            Gender
                        </label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px",
                                fontSize: "16px",
                                border: "1px solid #ccc",
                                borderRadius: "4px"
                            }}
                        >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                    </div>

                    <div style={{ marginTop: "30px" }}>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: "12px 24px",
                                fontSize: "16px",
                                backgroundColor: "#34a853",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: saving ? "not-allowed" : "pointer",
                                opacity: saving ? 0.6 : 1
                            }}
                        >
                            {saving ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
