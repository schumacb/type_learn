// Utility functions shared across the application.

export function normalizeFilename(str) {
    if (typeof str !== 'string') {
        return "";
    }
    return str
        .replaceAll(" ", "_")
        .replaceAll("Ä", "AE")
        .replaceAll("Ö", "OE")
        .replaceAll("Ü", "UE")
        .replaceAll("ä", "ae")
        .replaceAll("ö", "oe")
        .replaceAll("ü", "ue")
        .replaceAll("ß", "SS")
        .replace(/[^A-Za-z0-9_]/g, "");
}

export function getRandomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#1B98E0', '#C44569', '#F8B500', '#6C5CE7'];
    return colors[Math.floor(Math.random() * colors.length)];
}
