const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1100,
    height: 900,
    webPreferences: {
      // For this simple, local-only game, we don't need advanced security.
      // But it's good practice to keep these settings in mind.
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.png') // Optional: if you have an app icon
  });

  // and load the index.html of the app.
  win.loadFile(path.join(__dirname, 'TippenLernen.html'));

  // Optional: Open the DevTools for debugging.
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS it's common for applications to stay active until the user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});