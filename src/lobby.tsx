import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { app } from "./firebase";
import Banner from "./banner";
import CustomAlert from "./CustomAlert";
import { useDebug } from "./DebugContext";
import Footer from "./footer";
import { getOrCreateGuestUUID } from "./guestUtils";

// TypeScript interface for game_info.json
interface GameInfo {
    game_name: string;
    game_number: number;
    game_panel_image: string;
    min_players: number;
    max_players: number;
    languages_supported: string;
    suggested_age_range: string;
    minimum_age: number;
    promotion: string;
    description: string;
    rules: string;
    dev_server: string;
    local_server: string;
    alpha_server: string;
    beta_server: string;
    prod_server: string;
    entry_page: string;
}

interface ServerStatus {
    prod: boolean;      // 9xxx alive
    devBackend: boolean; // 10xxx alive
    devFrontend: boolean; // 11xxx alive
}

interface GameData extends GameInfo {
    folderName: string;
    imageLoaded: boolean;
}

type DeploymentMode = 'local' | 'alpha' | 'beta' | 'prod';

/**
 * @route /lobby
 */
export default function Lobby() {
    const [user, setUser] = useState<any>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [games, setGames] = useState<GameData[]>([]);
    const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
    const [expandedRules, setExpandedRules] = useState<string | null>(null);
    const [guestUUID, setGuestUUID] = useState<string | null>(null);
    const [serverStatuses, setServerStatuses] = useState<Map<number, ServerStatus>>(new Map());
    const navigate = useNavigate();
    const { DEBUG } = useDebug();

    // Custom alert function with copy button
    const showAlert = (message: string) => {
        setAlertMessage(message);
    };

    // Get deployment mode from environment variable (default to 'local')
    const getDeploymentMode = (): DeploymentMode => {
        const mode = import.meta.env.VITE_DEPLOYMENT_MODE as DeploymentMode;
        return mode || 'local';
    };

    // Get server URL based on deployment mode and server type
    const getServerUrl = (gameInfo: GameInfo, serverType: 'prod' | 'dev' = 'prod'): string => {
        // In debug mode, if serverType is 'dev', use dev_server
        if (DEBUG && serverType === 'dev') {
            return gameInfo.dev_server;
        }

        // Otherwise use deployment mode logic
        const mode = getDeploymentMode();
        switch (mode) {
            case 'local': return gameInfo.local_server;
            case 'alpha': return gameInfo.alpha_server;
            case 'beta': return gameInfo.beta_server;
            case 'prod': return gameInfo.prod_server;
            default: return gameInfo.local_server;
        }
    };

    // Health check function - pings a server URL
    const checkServerHealth = async (url: string): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    };

    // Check all servers for a game
    const checkGameServers = async (gameNumber: number): Promise<ServerStatus> => {
        const prodUrl = `http://localhost:${9000 + gameNumber}`;
        const devBackendUrl = `http://localhost:${10000 + gameNumber}`;
        const devFrontendUrl = `http://localhost:${11000 + gameNumber}`;

        const [prod, devBackend, devFrontend] = await Promise.all([
            checkServerHealth(prodUrl),
            checkServerHealth(devBackendUrl),
            checkServerHealth(devFrontendUrl)
        ]);

        return { prod, devBackend, devFrontend };
    };

    // Load game data on mount
    useEffect(() => {
        const loadGames = async () => {
            // Hardcoded list of game folder names (Option A)
            const gameFolders = ['wordguess'];

            const loadedGames: GameData[] = [];

            for (const folder of gameFolders) {
                try {
                    const response = await fetch(`/games/${folder}/game_info.json`);
                    if (!response.ok) {
                        console.error(`Failed to load game info for ${folder}`);
                        continue;
                    }

                    const gameInfo: GameInfo = await response.json();

                    loadedGames.push({
                        ...gameInfo,
                        folderName: folder,
                        imageLoaded: false
                    });

                } catch (error) {
                    console.error(`Error loading game ${folder}:`, error);
                }
            }

            // Set games state FIRST before starting image loads
            setGames(loadedGames);

            // THEN start preloading images
            loadedGames.forEach((gameData) => {
                const img = new Image();
                img.src = `/games/${gameData.folderName}/${gameData.game_panel_image}`;

                img.onload = () => {
                    setGames(prev => prev.map(g =>
                        g.folderName === gameData.folderName ? { ...g, imageLoaded: true } : g
                    ));
                };

                img.onerror = () => {
                    console.error(`Failed to load image for ${gameData.folderName}`);
                    setGames(prev => prev.map(g =>
                        g.folderName === gameData.folderName ? { ...g, imageLoaded: true } : g
                    ));
                };
            });
        };

        loadGames();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(app), (currentUser) => {
            setUser(currentUser);

            // If user is not authenticated, assign a guest UUID (only if they don't already have one)
            if (!currentUser) {
                const uuid = getOrCreateGuestUUID();
                setGuestUUID(uuid);
            }
        });

        return () => unsubscribe();
    }, []);

    // Health check every 10 seconds
    useEffect(() => {
        const runHealthChecks = async () => {
            const statusMap = new Map<number, ServerStatus>();

            for (const game of games) {
                const status = await checkGameServers(game.game_number);
                statusMap.set(game.game_number, status);
            }

            setServerStatuses(statusMap);
        };

        if (games.length > 0) {
            runHealthChecks(); // Run immediately
            const interval = setInterval(runHealthChecks, 2500); // Then every 2.5 seconds
            return () => clearInterval(interval);
        }
    }, [games]);

    const handleGameClick = async (gameData: GameData, serverType: 'prod' | 'dev' = 'prod') => {
        if (!user) {
            showAlert("Please sign in to play games!");
            navigate("/signin");
        } else if (!DEBUG && !user.emailVerified) {
            showAlert("Please verify your email address before playing games. Check your inbox for the verification email.");
            return;
        } else {
            try {
                let frontendUrl: string; // Where we launch the game UI
                let backendUrl: string;  // Where we make API calls

                if (serverType === 'dev') {
                    // For dev mode, use 11xxx for frontend if alive, otherwise 10xxx
                    // But ALWAYS use 10xxx for API calls
                    const viteUrl = `http://localhost:${11000 + gameData.game_number}`;
                    const devBackendUrl = `http://localhost:${10000 + gameData.game_number}`;

                    const viteAlive = await checkServerHealth(viteUrl);
                    frontendUrl = viteAlive ? viteUrl : devBackendUrl;
                    backendUrl = devBackendUrl; // Always use backend for API

                    console.log(`Dev server selection: Vite (${viteUrl}) ${viteAlive ? 'ALIVE' : 'DOWN'}, using frontend=${frontendUrl}, backend=${backendUrl}`);
                } else {
                    // For prod, both frontend and backend are the same server
                    const prodUrl = getServerUrl(gameData, serverType);
                    frontendUrl = prodUrl;
                    backendUrl = prodUrl;
                }

                console.log(`Getting Firebase ID token for ${gameData.game_name}`);
                const auth = getAuth(app);
                const idToken = await auth.currentUser?.getIdToken();

                if (idToken) {
                    // Verify token with game server (use backend URL)
                    const verifyUrl = `${backendUrl}/api/verify-token`;
                    console.log(`Verifying token for ${gameData.game_name} at ${verifyUrl}`);

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
                        // Authentication successful - no dialog needed
                        console.log(`Authentication successful for ${data.user.email} (${data.user.profile.username})`);

                        // Create game session with token in body (use backend URL)
                        const sessionUrl = `${backendUrl}/api/game-session`;
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
                            // Session created successfully - no dialog needed, just launch the game
                            console.log(`Session created successfully. Session ID: ${sessionData.sessionId}`);

                            // Always use backend URL with GET request (sessionId as query param)
                            // Backend will detect if Vite is running and redirect if needed (dev-vite mode)
                            // or serve the built app directly (dev/prod mode)
                            const url = `${backendUrl}/${gameData.entry_page}?sessionId=${sessionData.sessionId}`;
                            console.log(`Opening game URL: ${url}`);
                            window.open(url, '_blank');
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

    return (
        <div style={{ backgroundColor: "#ffe5cc", minHeight: "100vh" }}>
            {alertMessage && (
                <CustomAlert
                    message={alertMessage}
                    onClose={() => setAlertMessage(null)}
                />
            )}
            <Banner user={user} />
            <div className="lobby-container" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
                <h1 className="page-title">TransVerse Hub Lobby</h1>

            <div style={{ marginBottom: "30px" }}>
                <p>Welcome to TransVerse Hub! This is your central lobby for jumping into many multiplayer games and other educational multiplayer activities.</p>
                <p>You must be signed in to access the games and activies below.</p>
            </div>

            <div>
                <h2>Available Games and Activities</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                    {games.map((game, index) => (
                        <div
                            key={index}
                            style={{
                                border: "3px solid #000",
                                borderRadius: "8px",
                                padding: "0",
                                backgroundColor: "white",
                                overflow: "hidden",
                                transition: "transform 0.2s, box-shadow 0.2s"
                            }}
                        >
                            {/* Game Panel Image */}
                            <div
                                className="game-panel-image"
                                style={{
                                    width: "100%",
                                    height: "270px",
                                    backgroundColor: "#f0f0f0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                    cursor: user ? "pointer" : "not-allowed"
                                }}
                                onClick={() => user && handleGameClick(game, 'prod')}
                                onMouseEnter={(e) => {
                                    if (!user) {
                                        e.currentTarget.style.outline = "3px solid #e74c3c";
                                        e.currentTarget.style.outlineOffset = "-3px";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!user) {
                                        e.currentTarget.style.outline = "none";
                                    }
                                }}
                            >
                                {!game.imageLoaded && (
                                    <div style={{ fontSize: "24px", color: "#999" }}>⟳ Loading...</div>
                                )}
                                <img
                                    src={`/games/${game.folderName}/${game.game_panel_image}`}
                                    alt={game.game_name}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: game.imageLoaded ? "block" : "none"
                                    }}
                                />
                            </div>

                            {/* Game Info Section */}
                            <div className="game-panel-info" style={{ padding: "15px" }}>
                                {/* Game Name */}
                                <h3 className="game-name" style={{ margin: "0 0 10px 0", fontSize: "20px" }}>{game.game_name}</h3>

                                {/* Key Info */}
                                <div className="game-info-text" style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                                    <div>👥 {game.min_players}-{game.max_players} players</div>
                                    <div>🎂 Suggested Ages: {game.suggested_age_range}</div>
                                    {game.minimum_age > 0 && (
                                        <div>🔞 Minimum Age: {game.minimum_age}</div>
                                    )}
                                    <div>🌐 Supported Languages: {game.languages_supported}</div>
                                </div>

                                {/* Promotion Text */}
                                <p style={{ fontSize: "14px", fontWeight: "bold", color: "#e67e22", marginBottom: "10px" }}>
                                    {game.promotion}
                                </p>

                                {/* Expandable Description */}
                                <div style={{ marginBottom: "8px" }}>
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedDescription(expandedDescription === game.folderName ? null : game.folderName);
                                        }}
                                        style={{
                                            cursor: "pointer",
                                            color: "#e67e22",
                                            fontSize: "14px",
                                            textDecoration: "underline",
                                            marginBottom: "5px"
                                        }}
                                    >
                                        {expandedDescription === game.folderName ? "▼ Description" : "▶ Description"}
                                    </div>
                                    {expandedDescription === game.folderName && (
                                        <p style={{ fontSize: "13px", color: "#444", marginLeft: "15px", marginTop: "5px" }}>
                                            {game.description}
                                        </p>
                                    )}
                                </div>

                                {/* Expandable Rules */}
                                <div style={{ marginBottom: "10px" }}>
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedRules(expandedRules === game.folderName ? null : game.folderName);
                                        }}
                                        style={{
                                            cursor: "pointer",
                                            color: "#e67e22",
                                            fontSize: "14px",
                                            textDecoration: "underline",
                                            marginBottom: "5px"
                                        }}
                                    >
                                        {expandedRules === game.folderName ? "▼ Rules" : "▶ Rules"}
                                    </div>
                                    {expandedRules === game.folderName && (
                                        <p style={{ fontSize: "13px", color: "#444", marginLeft: "15px", marginTop: "5px" }}>
                                            {game.rules}
                                        </p>
                                    )}
                                </div>

                                {/* Play Buttons - Production and Dev */}
                                {!user ? (
                                    // User not authenticated: Show sign-in button
                                    <button
                                        onClick={() => navigate("/signin")}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#3498db",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            fontSize: "16px",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2980b9"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#3498db"}
                                    >
                                        Sign In to Play
                                    </button>
                                ) : DEBUG ? (
                                    // Debug mode: Show both buttons with dimming
                                    (() => {
                                        const status = serverStatuses.get(game.game_number);
                                        const prodAlive = status?.prod ?? false;
                                        const devAlive = (status?.devFrontend || status?.devBackend) ?? false;

                                        return (
                                            <div style={{ display: "flex", gap: "10px" }}>
                                                <button
                                                    onClick={() => prodAlive && handleGameClick(game, 'prod')}
                                                    style={{
                                                        flex: 1,
                                                        padding: "10px",
                                                        backgroundColor: prodAlive ? "#e67e22" : "#999",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        fontSize: "12px",
                                                        fontWeight: "bold",
                                                        cursor: prodAlive ? "pointer" : "not-allowed",
                                                        opacity: prodAlive ? 1 : 0.5,
                                                        transition: "background-color 0.2s",
                                                        whiteSpace: "pre-line"
                                                    }}
                                                    onMouseEnter={(e) => prodAlive && (e.currentTarget.style.backgroundColor = "#c0611f")}
                                                    onMouseLeave={(e) => prodAlive && (e.currentTarget.style.backgroundColor = "#e67e22")}
                                                    disabled={!prodAlive}
                                                >
                                                    {`PLAY NOW\nPROD\nlocalhost:${9000 + game.game_number}`}
                                                </button>
                                                <button
                                                    onClick={() => devAlive && handleGameClick(game, 'dev')}
                                                    style={{
                                                        flex: 1,
                                                        padding: "10px",
                                                        backgroundColor: devAlive ? "#3498db" : "#999",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        fontSize: "12px",
                                                        fontWeight: "bold",
                                                        cursor: devAlive ? "pointer" : "not-allowed",
                                                        opacity: devAlive ? 1 : 0.5,
                                                        transition: "background-color 0.2s",
                                                        whiteSpace: "pre-line"
                                                    }}
                                                    onMouseEnter={(e) => devAlive && (e.currentTarget.style.backgroundColor = "#2c7cb8")}
                                                    onMouseLeave={(e) => devAlive && (e.currentTarget.style.backgroundColor = "#3498db")}
                                                    disabled={!devAlive}
                                                >
                                                    {`PLAY NOW\nDEV${status?.devFrontend ? '-VITE' : ''}\n:${10000 + game.game_number}`}
                                                </button>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    // Non-debug mode: Show only production button
                                    <button
                                        onClick={() => handleGameClick(game, 'prod')}
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            backgroundColor: "#e67e22",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            fontSize: "16px",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            transition: "background-color 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#c0611f"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#e67e22"}
                                    >
                                        PLAY NOW
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            </div>
            <Footer />
        </div>
    );
}
