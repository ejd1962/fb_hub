import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "./firebase";
import Banner from "./banner";
import { countries } from "./countries";
import { languages } from "./languages";
import Footer from "./footer";
import { isUsernameUnique } from "./usernameUtils";
import { findForbiddenWords } from "./civilityEnforcementUtils";

/**
 * @route /profile
 */
export default function Profile() {
    const [user, setUser] = useState<any>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [usernameDateChosen, setUsernameDateChosen] = useState("");
    const [isUsernameTemporary, setIsUsernameTemporary] = useState(true);
    const [language, setLanguage] = useState("");
    const [country, setCountry] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [gender, setGender] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Store original values to compare for changes
    const [originalFirstName, setOriginalFirstName] = useState("");
    const [originalLastName, setOriginalLastName] = useState("");
    const [originalUsername, setOriginalUsername] = useState("");
    const [originalLanguage, setOriginalLanguage] = useState("");
    const [originalCountry, setOriginalCountry] = useState("");
    const [originalBirthDate, setOriginalBirthDate] = useState("");
    const [originalGender, setOriginalGender] = useState("");

    const navigate = useNavigate();
    const db = getFirestore(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), async (currentUser) => {
            if (!currentUser) {
                navigate("/signin");
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
                const loadedFirstName = data.firstName || "";
                const loadedLastName = data.lastName || "";
                const loadedUsername = data.username || "";
                const loadedUsernameDateChosen = data.username_date_chosen || "0000/00/00";
                const loadedLanguage = data.language || "";
                const loadedCountry = data.country || "";
                const loadedBirthDate = data.birthDate || "";
                const loadedGender = data.gender || "";

                setFirstName(loadedFirstName);
                setLastName(loadedLastName);
                setUsername(loadedUsername);
                setUsernameDateChosen(loadedUsernameDateChosen);
                setIsUsernameTemporary(loadedUsernameDateChosen === "0000/00/00");
                setLanguage(loadedLanguage);
                setCountry(loadedCountry);
                setBirthDate(loadedBirthDate);
                setGender(loadedGender);

                // Store original values
                setOriginalFirstName(loadedFirstName);
                setOriginalLastName(loadedLastName);
                setOriginalUsername(loadedUsername);
                setOriginalLanguage(loadedLanguage);
                setOriginalCountry(loadedCountry);
                setOriginalBirthDate(loadedBirthDate);
                setOriginalGender(loadedGender);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    // Check if any field has changed
    const hasChanges = () => {
        return (
            firstName !== originalFirstName ||
            lastName !== originalLastName ||
            username !== originalUsername ||
            language !== originalLanguage ||
            country !== originalCountry ||
            birthDate !== originalBirthDate ||
            gender !== originalGender
        );
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage("");

        try {
            // Check for forbidden words in first name
            const firstNameCheck = findForbiddenWords(firstName, true);
            if (firstNameCheck.forbiddenWordCount > 0) {
                setMessage("Error: First name contains inappropriate language. Please use a respectful name.");
                setSaving(false);
                return;
            }

            // Check for forbidden words in last name
            const lastNameCheck = findForbiddenWords(lastName, true);
            if (lastNameCheck.forbiddenWordCount > 0) {
                setMessage("Error: Last name contains inappropriate language. Please use a respectful name.");
                setSaving(false);
                return;
            }

            // Check for forbidden words in username
            const usernameCheck = findForbiddenWords(username, true);
            if (usernameCheck.forbiddenWordCount > 0) {
                setMessage("Error: Username contains inappropriate language. Please choose a different username.");
                setSaving(false);
                return;
            }

            // If username has changed and it was temporary, check uniqueness and update date
            let newUsernameDateChosen = usernameDateChosen;
            if (username !== originalUsername && isUsernameTemporary) {
                // Check if new username is unique
                const isUnique = await isUsernameUnique(username);
                if (!isUnique) {
                    setMessage("Error: Username is already taken. Please choose a different username.");
                    setSaving(false);
                    return;
                }

                // Set the date the username was chosen
                const today = new Date();
                newUsernameDateChosen = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
                setUsernameDateChosen(newUsernameDateChosen);
                setIsUsernameTemporary(false);
            }

            await setDoc(doc(db, "profile", user.uid), {
                firstName,
                lastName,
                username,
                username_date_chosen: newUsernameDateChosen,
                language,
                country,
                birthDate,
                gender,
                email: user.email,
                updatedAt: new Date().toISOString()
            });

            setMessage("Profile saved successfully!");
            console.log("Profile saved for user:", user.uid);

            // Update original values to reflect saved state
            setOriginalFirstName(firstName);
            setOriginalLastName(lastName);
            setOriginalUsername(username);
            setOriginalLanguage(language);
            setOriginalCountry(country);
            setOriginalBirthDate(birthDate);
            setOriginalGender(gender);

            // Clear message after 3 seconds
            setTimeout(() => {
                setMessage("");
            }, 3000);
        } catch (error: any) {
            console.error("Error saving profile:", error);
            setMessage("Error saving profile: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                <Banner user={user} />
                <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", flex: "1" }}>
                    <p>Loading profile...</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Banner user={user} />
            <div style={{ padding: "20px", paddingTop: "0", flex: "1" }}>
                <h1 className="page-title" style={{ marginLeft: "20px" }}>User Profile</h1>

                <div className="profile-panel" style={{
                    backgroundColor: "white",
                    padding: "30px",
                    margin: "0 20px",
                    borderRadius: "8px",
                    border: "3px solid #000"
                }}>
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
                            Username {!isUsernameTemporary && "(cannot be changed)"}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            readOnly={!isUsernameTemporary}
                            style={{
                                width: "100%",
                                padding: "10px",
                                fontSize: "16px",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                backgroundColor: !isUsernameTemporary ? "#f5f5f5" : "white",
                                cursor: !isUsernameTemporary ? "not-allowed" : "text"
                            }}
                        />
                        {isUsernameTemporary && (
                            <small style={{ color: "#666", display: "block", marginTop: "5px" }}>
                                This is a temporary username. You can change it once to your preferred username.
                            </small>
                        )}
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
                            Birth Date
                        </label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
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

                    <div style={{ marginTop: "30px", display: "flex", alignItems: "center", gap: "15px" }}>
                        <button
                            type="submit"
                            disabled={saving || !hasChanges()}
                            style={{
                                padding: "12px 24px",
                                fontSize: "16px",
                                backgroundColor: (saving || !hasChanges()) ? "#ccc" : "#34a853",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: (saving || !hasChanges()) ? "not-allowed" : "pointer",
                                opacity: (saving || !hasChanges()) ? 0.6 : 1
                            }}
                        >
                            {saving ? "Saving..." : "Save Profile"}
                        </button>
                        {message && !message.includes("Error") && (
                            <div
                                style={{
                                    color: "#2e7d32",
                                    fontSize: "14px",
                                    fontWeight: "500"
                                }}
                            >
                                {message}
                            </div>
                        )}
                        {message && message.includes("Error") && (
                            <div
                                style={{
                                    color: "#c62828",
                                    fontSize: "14px",
                                    fontWeight: "500"
                                }}
                            >
                                {message}
                            </div>
                        )}
                    </div>
                </form>
                </div>

                <div style={{ margin: "20px 20px 0 20px" }}>
                    <span
                        onClick={() => navigate("/change_email_or_pw")}
                        style={{
                            color: "#e67e22",
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontSize: "14px",
                            fontWeight: "bold"
                        }}
                    >
                        Update Password or Email
                    </span>
                </div>
            </div>
            <Footer />
        </div>
    );
}
