import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "./firebase";
import Banner from "./banner";
import CustomAlert from "./CustomAlert";

export default function Lobby() {
    const [user, setUser] = useState<any>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    // Custom alert function with copy button
    const showAlert = (message: string) => {
        setAlertMessage(message);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    const handleGameClick = async (gameName: string, gameUrl: string) => {
        if (!user) {
            showAlert("Please sign in to play games!");
            navigate("/login");
        } else {
            try {
                console.log(`Getting Firebase ID token for ${gameName}`);
                const auth = getAuth(app);
                const idToken = await auth.currentUser?.getIdToken();

                if (idToken) {
                    // Verify token with game server
                    const verifyUrl = `${gameUrl}/api/verify-token`;
                    console.log(`Verifying token for ${gameName} at ${verifyUrl}`);

                    let response;
                    try {
                        response = await fetch(verifyUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ token: idToken })
                        });
                    } catch (fetchError: any) {
                        throw new Error(`Failed to connect to ${verifyUrl}: ${fetchError.message}`);
                    }

                    let data;
                    try {
                        data = await response.json();
                    } catch (parseError: any) {
                        throw new Error(`Failed to parse response from ${verifyUrl}: ${parseError.message}`);
                    }
                    console.log('Token verification response:', data);

                    if (data.success) {
                        showAlert(`Authentication successful!\nURL: ${verifyUrl}\nUser: ${data.user.email}\nUsername: ${data.user.profile.username}`);

                        // Create game session with token in body
                        const sessionUrl = `${gameUrl}/api/game-session`;
                        console.log(`Creating game session at ${sessionUrl}`);

                        let sessionResponse;
                        try {
                            sessionResponse = await fetch(sessionUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ token: idToken })
                            });
                        } catch (fetchError: any) {
                            throw new Error(`Failed to connect to ${sessionUrl}: ${fetchError.message}`);
                        }

                        let sessionData;
                        try {
                            sessionData = await sessionResponse.json();
                        } catch (parseError: any) {
                            throw new Error(`Failed to parse response from ${sessionUrl}: ${parseError.message}`);
                        }
                        console.log('Game session response:', sessionData);

                        if (sessionData.success) {
                            showAlert(`Session created successfully!\nURL: ${sessionUrl}\nSession ID: ${sessionData.sessionId}`);

                            // Create a form to POST sessionId to lobby
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = `${gameUrl}/lobby`;
                            form.target = '_blank';

                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'sessionId';
                            input.value = sessionData.sessionId;

                            form.appendChild(input);
                            document.body.appendChild(form);
                            form.submit();
                            document.body.removeChild(form);
                        } else {
                            showAlert(`Session creation failed!\nURL: ${sessionUrl}\nMessage: ${sessionData.message}`);
                        }
                    } else {
                        showAlert(`Authentication failed!\nURL: ${verifyUrl}\nMessage: ${data.message}`);
                    }
                } else {
                    console.error("Failed to get ID token");
                    showAlert("Authentication error. Please try signing in again.");
                }
            } catch (error: any) {
                console.error("Error during game launch:", error);
                showAlert(`Error launching game!\nError: ${error.message}\nDetails: ${error.toString()}\n\nPlease check console for more details.`);
            }
        }
    };

    const games = [
        { name: "TestGame", description: "Multiplayer test game", url: "http://localhost:9001" },
        { name: "Guess A Word", description: "Word guessing game", url: "http://localhost:9002" },
        { name: "Game 3", description: "Third awesome game", url: "http://localhost:9003" },
    ];

    return (
        <div>
            {alertMessage && (
                <CustomAlert
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
            <Banner user={user} />
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
                <h1>Fb-Hub Lobby</h1>

            <div style={{ marginBottom: "30px" }}>
                <h2>About</h2>
                <p>Welcome to the Gaming Hub! This is your central lobby for accessing all our games.</p>
                <p>Sign in to unlock access to all available games below.</p>
            </div>

            <div>
                <h2>Available Games</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                    {games.map((game, index) => (
                        <div
                            key={index}
                            style={{
                                border: "1px solid #ccc",
                                borderRadius: "8px",
                                padding: "20px",
                                backgroundColor: "white",
                                cursor: user ? "pointer" : "not-allowed",
                                opacity: user ? 1 : 0.6,
                                transition: "transform 0.2s, box-shadow 0.2s"
                            }}
                            onClick={() => handleGameClick(game.name, game.url)}
                            onMouseEnter={(e) => {
                                if (user) {
                                    e.currentTarget.style.transform = "translateY(-5px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <h3>{game.name}</h3>
                            <p>{game.description}</p>
                            {!user && (
                                <p style={{ color: "#d32f2f", fontSize: "14px", marginTop: "10px" }}>
                                    🔒 Sign in required
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            </div>
        </div>
    );
}
