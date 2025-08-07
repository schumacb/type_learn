// Configuration for the keyboard layout, colors, and other constants.

export const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['Y', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.'],
    [' '] // Space bar
];

export const splitPoints = [6, 5, 5, 5];

export const homeRowKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'];

export const fingerColors = {
    'kleiner': '#FF6B6B',   // Pinky
    'ring': '#4ECDC4',      // Ring finger
    'mittel': '#FFD166',    // Middle finger
    'zeige': '#1B98E0'      // Index finger
};

export const fingerMap = {
    '1': 'kleiner', '2': 'ring', '3': 'mittel', '4': 'zeige',
    '5': 'zeige', '6': 'zeige', '7': 'zeige', '8': 'mittel', '9': 'ring',
    '0': 'kleiner', 'ß': 'kleiner',
    'Q': 'kleiner', 'W': 'ring', 'E': 'mittel', 'R': 'zeige', 'T': 'zeige',
    'Z': 'zeige', 'U': 'zeige', 'I': 'mittel', 'O': 'ring', 'P': 'kleiner',
    'Ü': 'kleiner',
    'A': 'kleiner', 'S': 'ring', 'D': 'mittel', 'F': 'zeige', 'G': 'zeige',
    'H': 'zeige', 'J': 'zeige', 'K': 'mittel', 'L': 'ring', 'Ö': 'kleiner',
    'Ä': 'kleiner',
    'Y': 'kleiner', 'X': 'ring', 'C': 'mittel', 'V': 'zeige',
    'B': 'zeige', 'N': 'zeige', 'M': 'zeige',
    ',': 'kleiner', '.': 'kleiner',
    ' ': 'zeige'
};

export const rowOffsets = [0, -30, -5, 20];

export const game = {
    progressIncrement: 10,
    levelUpDelay: 2000,
    wordCompleteDelay: 1000,
    introPause: 500,
};
