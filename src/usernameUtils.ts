import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { app } from "./firebase";

/**
 * Generates a random temporary username in format: user_xxxxxxxxx
 * where x is a lowercase letter or number (9 characters total)
 */
export function generateTemporaryUsername(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < 9; i++) {
        randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `user_${randomString}`;
}

/**
 * Checks if a username already exists in the profile collection
 */
export async function isUsernameUnique(username: string): Promise<boolean> {
    const db = getFirestore(app);
    const profilesRef = collection(db, "profile");
    const q = query(profilesRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    return querySnapshot.empty; // true if no documents found (username is unique)
}

/**
 * Generates a unique temporary username by checking against existing usernames
 * Will retry up to 10 times if collisions occur
 */
export async function generateUniqueTemporaryUsername(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const tempUsername = generateTemporaryUsername();
        const isUnique = await isUsernameUnique(tempUsername);

        if (isUnique) {
            return tempUsername;
        }

        attempts++;
    }

    // Fallback: add timestamp to ensure uniqueness
    return `user_${Date.now().toString(36)}`;
}
