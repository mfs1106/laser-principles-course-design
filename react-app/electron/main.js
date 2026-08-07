const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Packaged releases must always load local files and never open DevTools.
  // `NODE_ENV` can be inherited from a shell, so it is not reliable by itself.
  const isDevelopment = !app.isPackaged && (
    process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  );

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '高斯光束传播虚拟仿真实验平台',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // In development, load from Vite dev server
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
