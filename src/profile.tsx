import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChromePicker } from 'react-color';
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
    const [userColor, setUserColor] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [colorAdjustmentMessage, setColorAdjustmentMessage] = useState("");
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Store original values to compare for changes
    const [originalFirstName, setOriginalFirstName] = useState("");
    const [originalLastName, setOriginalLastName] = useState("");
    const [originalUsername, setOriginalUsername] = useState("");
    const [originalLanguage, setOriginalLanguage] = useState("");
    const [originalCountry, setOriginalCountry] = useState("");
    const [originalBirthDate, setOriginalBirthDate] = useState("");
    const [originalGender, setOriginalGender] = useState("");
    const [originalUserColor, setOriginalUserColor] = useState("");

    const navigate = useNavigate();
    const db = getFirestore(app);
    const colorInputRef = useRef<HTMLInputElement>(null);

    // Generate a random dark color (ensures white text is readable)
    const generateDarkColor = () => {
        // Generate HSL color with low lightness (30-45%) for dark colors
        const hue = Math.floor(Math.random() * 360);
        const saturation = 60 + Math.floor(Math.random() * 30); // 60-90%
        const lightness = 30 + Math.floor(Math.random() * 16); // 30-45%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    // Convert hex color to HSL to check lightness
    const hexToHSL = (hex: string) => {
        // Remove the # if present
        hex = hex.replace('#', '');

        // Convert hex to RGB
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // Darken a color to ensure white text is readable
    const ensureDarkColor = (color: string): { color: string; wasAdjusted: boolean } => {
        if (color.startsWith('hsl')) {
            // Parse HSL
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = parseInt(match[1]);
                const s = parseInt(match[2]);
                let l = parseInt(match[3]);

                // If lightness is too high, cap it at 45%
                if (l > 45) {
                    return { color: `hsl(${h}, ${s}%, 45%)`, wasAdjusted: true };
                }
                return { color: `hsl(${h}, ${s}%, ${l}%)`, wasAdjusted: false };
            }
        } else if (color.startsWith('#')) {
            // Convert hex to HSL, check lightness, convert back
            const hsl = hexToHSL(color);
            if (hsl.l > 45) {
                return {
                    color: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, 45%)`,
                    wasAdjusted: true
                };
            }
            return {
                color: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
                wasAdjusted: false
            };
        }
        return { color, wasAdjusted: false };
    };

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
            // Load from public profile collection
            const profileDoc = await getDoc(doc(db, "profile", uid));
            // Load from secure profile collection
            const profileSecureDoc = await getDoc(doc(db, "profile_secure", uid));

            if (profileDoc.exists()) {
                const data = profileDoc.data();
                const loadedFirstName = data.firstName || "";
                const loadedUsername = data.username || "";
                const loadedUsernameDateChosen = data.username_date_chosen || "0000/00/00";
                const loadedLanguage = data.language || "";
                const loadedCountry = data.country || "";
                const loadedBirthDate = data.birthDate || "";
                const loadedGender = data.gender || "";
                // Generate a random dark color if not present
                const loadedUserColor = data.userColor || generateDarkColor();

                setFirstName(loadedFirstName);
                setUsername(loadedUsername);
                setUsernameDateChosen(loadedUsernameDateChosen);
                setIsUsernameTemporary(loadedUsernameDateChosen === "0000/00/00");
                setLanguage(loadedLanguage);
                setCountry(loadedCountry);
                setBirthDate(loadedBirthDate);
                setGender(loadedGender);
                setUserColor(loadedUserColor);

                // Store original values
                setOriginalFirstName(loadedFirstName);
                setOriginalUsername(loadedUsername);
                setOriginalLanguage(loadedLanguage);
                setOriginalCountry(loadedCountry);
                setOriginalBirthDate(loadedBirthDate);
                setOriginalGender(loadedGender);
                setOriginalUserColor(loadedUserColor);
            }

            // Load lastName from secure profile
            if (profileSecureDoc.exists()) {
                const secureData = profileSecureDoc.data();
                const loadedLastName = secureData.lastName || "";
                setLastName(loadedLastName);
                setOriginalLastName(loadedLastName);
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
            gender !== originalGender ||
            userColor !== originalUserColor
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

            // Compute lastInitial from lastName
            const lastInitial = lastName ? lastName.charAt(0) : "";

            // Public profile data (readable by all authenticated users)
            const profileData = {
                firstName,
                lastInitial,
                username,
                username_date_chosen: newUsernameDateChosen,
                language,
                country,
                birthDate,
                gender,
                userColor,
                updatedAt: new Date().toISOString()
            };

            // Secure profile data (only readable by the user themselves)
            const profileSecureData = {
                lastName,
                email: user.email,
                updatedAt: new Date().toISOString()
            };

            // Write to both collections
            await setDoc(doc(db, "profile", user.uid), profileData);
            await setDoc(doc(db, "profile_secure", user.uid), profileSecureData);

            // Update localStorage with ONLY public profile data (no email, no lastName)
            localStorage.setItem("userProfile", JSON.stringify(profileData));

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
            setOriginalUserColor(userColor);

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
                                borderRadius: "4px",
                                boxSizing: "border-box"
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
                                borderRadius: "4px",
                                boxSizing: "border-box"
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                            Username {isUsernameTemporary ? "(temporary - can be changed once)" : "(cannot be changed)"}
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
                                cursor: !isUsernameTemporary ? "not-allowed" : "text",
                                boxSizing: "border-box"
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
                                borderRadius: "4px",
                                boxSizing: "border-box"
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
                                borderRadius: "4px",
                                boxSizing: "border-box"
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
                                borderRadius: "4px",
                                boxSizing: "border-box"
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
                                borderRadius: "4px",
                                boxSizing: "border-box"
                            }}
                        >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: "15px", position: "relative" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                            User Icon Color (used for chat bubbles and user icons)
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                            {/* Random Color Button */}
                            <button
                                type="button"
                                onClick={() => setUserColor(generateDarkColor())}
                                style={{
                                    padding: "8px 16px",
                                    fontSize: "14px",
                                    backgroundColor: "#2196F3",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Random Color
                            </button>

                            {/* Color Picker Button */}
                            <button
                                ref={colorInputRef}
                                type="button"
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                style={{
                                    padding: "8px 16px",
                                    fontSize: "14px",
                                    backgroundColor: "#4CAF50",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Color Picker
                            </button>

                            {/* Preview - User Icon Circle */}
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: userColor,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: "14px"
                            }}>
                                {lastName ? lastName.charAt(0).toUpperCase() : "?"}
                            </div>
                        </div>

                        {/* Color Picker Popup */}
                        {showColorPicker && (
                            <>
                                {/* Backdrop to close picker */}
                                <div
                                    onClick={() => setShowColorPicker(false)}
                                    style={{
                                        position: "fixed",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 1
                                    }}
                                />
                                {/* Color Picker positioned above button */}
                                <div style={{
                                    position: "absolute",
                                    bottom: "calc(100% + 1cm)",
                                    left: "130px",
                                    zIndex: 2
                                }}>
                                    <ChromePicker
                                        color={userColor}
                                        onChange={(color) => {
                                            const result = ensureDarkColor(color.hex);
                                            setUserColor(result.color);
                                            if (result.wasAdjusted) {
                                                setColorAdjustmentMessage("Color was darkened to ensure white text is readable");
                                                setTimeout(() => setColorAdjustmentMessage(""), 3000);
                                            }
                                        }}
                                        disableAlpha={true}
                                    />
                                </div>
                            </>
                        )}

                        {colorAdjustmentMessage && (
                            <div style={{
                                marginTop: "8px",
                                padding: "8px 12px",
                                backgroundColor: "#fff3cd",
                                color: "#856404",
                                border: "1px solid #ffeaa7",
                                borderRadius: "4px",
                                fontSize: "14px"
                            }}>
                                {colorAdjustmentMessage}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: "30px", display: "flex", alignItems: "center", gap: "15px" }}>
                        <button
                            type="submit"
                            disabled={saving || !hasChanges()}
                            style={{
                                padding: "12px 24px",
                                fontSize: "16px",
                                backgroundColor: (saving || !hasChanges()) ? "#888" : "#34a853",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: (saving || !hasChanges()) ? "not-allowed" : "pointer"
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
