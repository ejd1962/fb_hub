/**
 * Utility functions for managing guest user UUIDs
 */

const GUEST_UUID_KEY = 'guestUUID';

/**
 * Generates a random UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Gets the existing guest UUID from localStorage, or creates a new one if it doesn't exist.
 * Only creates a new UUID if one doesn't already exist.
 * @returns The guest UUID
 */
export function getOrCreateGuestUUID(): string {
    // Check if a guest UUID already exists
    let guestUUID = localStorage.getItem(GUEST_UUID_KEY);

    // Only create a new UUID if one doesn't exist
    if (!guestUUID) {
        guestUUID = generateUUID();
        localStorage.setItem(GUEST_UUID_KEY, guestUUID);
        console.log('Created new guest UUID:', guestUUID);
    } else {
        console.log('Using existing guest UUID:', guestUUID);
    }

    return guestUUID;
}

/**
 * Gets the current guest UUID without creating a new one
 * @returns The guest UUID or null if it doesn't exist
 */
export function getGuestUUID(): string | null {
    return localStorage.getItem(GUEST_UUID_KEY);
}

/**
 * Clears the guest UUID from localStorage
 */
export function clearGuestUUID(): void {
    localStorage.removeItem(GUEST_UUID_KEY);
    console.log('Cleared guest UUID');
}
