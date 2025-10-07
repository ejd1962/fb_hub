import { useEffect } from "react";

interface CustomAlertProps {
    message: string;
    onClose: () => void;
}

export default function CustomAlert({ message, onClose }: CustomAlertProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(message).then(() => {
            console.log("Copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy:", err);
        });
    };

    useEffect(() => {
        // Close on Escape key
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "white",
                    padding: "30px",
                    borderRadius: "8px",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    overflow: "auto",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <pre
                    style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        margin: "0 0 20px 0",
                        color: "#333"
                    }}
                >
                    {message}
                </pre>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button
                        onClick={handleCopy}
                        style={{
                            padding: "10px 20px",
                            fontSize: "16px",
                            backgroundColor: "#1a73e8",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "500"
                        }}
                    >
                        Copy
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 20px",
                            fontSize: "16px",
                            backgroundColor: "#34a853",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "500"
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
