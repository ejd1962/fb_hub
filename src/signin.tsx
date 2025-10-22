
import { useEffect, useState } from "react";
// imported from firebase auth sdk
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { app } from "./firebase";
import { useNavigate } from "react-router-dom";
import Banner from "./banner";
import { generateUniqueTemporaryUsername } from "./usernameUtils";
import { getOrCreateGuestUUID } from "./guestUtils";


export default function Login() {
    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState("");
    const [guestUUID, setGuestUUID] = useState<string | null>(null);
    const navigate = useNavigate();
    const db = getFirestore(app);

    useEffect(() => {
        // Sign out immediately when landing on login page
        const auth = getAuth(app);
        if (auth.currentUser) {
            console.log("LOGIN PAGE - User is signed in, signing out immediately");
            auth.signOut();
        }

        // Assign a guest UUID for unauthenticated users (only if they don't already have one)
        const uuid = getOrCreateGuestUUID();
        setGuestUUID(uuid);

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("LOGIN PAGE - Auth state changed:", currentUser);
            console.log("LOGIN PAGE - User email:", currentUser?.email);
            console.log("LOGIN PAGE - User UID:", currentUser?.uid);
            setUser(currentUser);

            // If user is authenticated, load profile and redirect to home
            if (currentUser) {
                console.log("LOGIN PAGE - User authenticated, loading profile");

                // Load profile from Firestore
                try {
                    const profileDoc = await getDoc(doc(db, "profile", currentUser.uid));
                    let profile: any = {};

                    if (profileDoc.exists()) {
                        profile = profileDoc.data();
                    }

                    // If username is blank, set it to email
                    if (!profile.username) {
                        profile.username = currentUser.email;
                    }

                    // Store profile in localStorage
                    localStorage.setItem("userProfile", JSON.stringify(profile));
                    console.log("LOGIN PAGE - Profile stored in localStorage:", profile);
                } catch (error) {
                    console.error("LOGIN PAGE - Error loading profile:", error);
                }

                console.log("LOGIN PAGE - Navigating to /home");
                navigate("/home");
            }
        });

        return () => unsubscribe();
    }, [navigate, db]);

    const handleGoogleSignIn = async () => {
        console.log("Google sign-in clicked");
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            console.log("Google sign-in successful!", result.user);

            // Check if profile exists, if not create one with temporary username
            const profileDoc = await getDoc(doc(db, "profile", result.user.uid));
            if (!profileDoc.exists()) {
                const tempUsername = await generateUniqueTemporaryUsername();
                const newProfile = {
                    username: tempUsername,
                    username_date_chosen: "0000/00/00",
                    email: result.user.email,
                    firstName: "",
                    lastName: "",
                    language: "",
                    country: "",
                    birthDate: "",
                    gender: "",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await setDoc(doc(db, "profile", result.user.uid), newProfile);

                // Store in localStorage
                localStorage.setItem("userProfile", JSON.stringify(newProfile));
                console.log("Profile created with temporary username:", tempUsername);
            }
        } catch (error: any) {
            console.error("Google sign-in failed:", error);
            setError(error.message);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const auth = getAuth(app);

        try {
            if (isSignUp) {
                console.log("Creating account with email/password");
                const result = await createUserWithEmailAndPassword(auth, email, password);
                console.log("Account created successfully!", result.user);

                // Create profile with temporary username
                const tempUsername = await generateUniqueTemporaryUsername();
                const newProfile = {
                    username: tempUsername,
                    username_date_chosen: "0000/00/00",
                    email: result.user.email,
                    firstName: "",
                    lastName: "",
                    language: "",
                    country: "",
                    birthDate: "",
                    gender: "",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await setDoc(doc(db, "profile", result.user.uid), newProfile);

                // Store in localStorage
                localStorage.setItem("userProfile", JSON.stringify(newProfile));
                console.log("Profile created with temporary username:", tempUsername);

                // Send verification email
                await sendEmailVerification(result.user);
                console.log("Verification email sent to:", result.user.email);
                alert(`Account created! A verification email has been sent to ${result.user.email}`);
            } else {
                console.log("Signing in with email/password");
                const result = await signInWithEmailAndPassword(auth, email, password);
                console.log("Sign-in successful!", result.user);
            }
        } catch (error: any) {
            console.error("Email auth failed:", error);
            setError(error.message);
        }
    };

    return (
        <div>
            <Banner user={user} />
            <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
                <h1>Sign In</h1>

            {error && (
                <div style={{ padding: "10px", backgroundColor: "#ffebee", color: "#c62828", marginBottom: "20px" }}>
                    {error}
                </div>
            )}

            <div style={{ marginBottom: "30px" }}>
                <button
                    onClick={handleGoogleSignIn}
                    style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "16px",
                        backgroundColor: "#4285f4",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Sign in with Google
                </button>
            </div>

            <div style={{ textAlign: "center", margin: "20px 0" }}>
                <span>OR</span>
            </div>

            <form onSubmit={handleEmailAuth}>
                <h3>{isSignUp ? "Create Account" : "Sign In"} with Email</h3>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "10px",
                        fontSize: "16px",
                        border: "1px solid #ccc",
                        borderRadius: "4px"
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "10px",
                        fontSize: "16px",
                        border: "1px solid #ccc",
                        borderRadius: "4px"
                    }}
                />

                <button
                    type="submit"
                    style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "16px",
                        backgroundColor: "#34a853",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    {isSignUp ? "Create Account" : "Sign In"}
                </button>
            </form>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    style={{
                        background: "none",
                        border: "none",
                        color: "#1a73e8",
                        cursor: "pointer",
                        textDecoration: "underline"
                    }}
                >
                    {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                </button>
            </div>

            <div style={{ margin: "30px 0", padding: "10px", border: "1px solid #ccc" }}>
                <h3>Current User Details:</h3>
                {user ? (
                    <pre style={{ textAlign: "left", overflow: "auto", fontSize: "12px" }}>
                        {JSON.stringify(user, null, 2)}
                    </pre>
                ) : (
                    <p>No user authenticated</p>
                )}
            </div>
            </div>
        </div>
    );

}


