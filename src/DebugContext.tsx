import { createContext, useContext, useState, ReactNode } from "react";
import { ALLOW_DEBUG } from "./constants";

interface DebugContextType {
    DEBUG: boolean;
    setDEBUG: (value: boolean) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
    // If ALLOW_DEBUG is false, DEBUG is always false
    // If ALLOW_DEBUG is true, DEBUG defaults to true (can be toggled)
    const [DEBUG, setDEBUG] = useState(ALLOW_DEBUG ? true : false);

    return (
        <DebugContext.Provider value={{ DEBUG, setDEBUG }}>
            {children}
        </DebugContext.Provider>
    );
}

export function useDebug() {
    const context = useContext(DebugContext);
    if (context === undefined) {
        throw new Error("useDebug must be used within a DebugProvider");
    }
    return context;
}
