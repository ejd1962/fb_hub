// Site map defines parent-child relationships: parent : child
export const siteMap: { [key: string]: string } = {
    "/login": "/home",
    "/home": "/profile",
    "/home": "/lobby",
    "/lobby": "/game_lobby"  // This represents any game lobby accessed from main lobby
};

// Function to get parent page of current page
export const getParentPage = (currentPath: string): string => {
    // Find the parent by looking for the entry where current path is the child
    for (const [parent, child] of Object.entries(siteMap)) {
        if (child === currentPath) {
            return parent;
        }
    }

    // Special cases based on URL patterns
    if (currentPath === "/profile") return "/home";
    if (currentPath === "/lobby") return "/home";
    if (currentPath === "/home") return "/login";

    // Default fallback
    return "/";
};
