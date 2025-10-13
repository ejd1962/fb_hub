import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

interface NavigationHistoryContextType {
    priorPageList: string[];
    goBack: () => string | null;
    getLastPage: () => string | null;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
    const [priorPageList, setPriorPageList] = useState<string[]>([]);
    const location = useLocation();
    const previousPathRef = useRef<string | null>(null);

    useEffect(() => {
        // When location changes, save the previous location to history
        if (previousPathRef.current && previousPathRef.current !== location.pathname) {
            // Only add if it's different from the last item in history
            setPriorPageList(prev => {
                const lastInHistory = prev[prev.length - 1];
                if (lastInHistory !== previousPathRef.current) {
                    return [...prev, previousPathRef.current!];
                }
                return prev;
            });
        }

        // Update the previous path reference
        previousPathRef.current = location.pathname;
    }, [location.pathname]);

    const goBack = (): string | null => {
        if (priorPageList.length === 0) return null;

        const lastPage = priorPageList[priorPageList.length - 1];
        setPriorPageList(prev => prev.slice(0, -1));
        return lastPage;
    };

    const getLastPage = (): string | null => {
        if (priorPageList.length === 0) return null;
        return priorPageList[priorPageList.length - 1];
    };

    return (
        <NavigationHistoryContext.Provider value={{ priorPageList, goBack, getLastPage }}>
            {children}
        </NavigationHistoryContext.Provider>
    );
}

export function useNavigationHistory() {
    const context = useContext(NavigationHistoryContext);
    if (!context) {
        throw new Error("useNavigationHistory must be used within a NavigationHistoryProvider");
    }
    return context;
}
