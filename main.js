const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools(); // Remove in production
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// IPC handlers (stub - to be implemented with database)
ipcMain.handle('settings:get', async () => {
  return { businessName: 'Superior Audio & Video' };
});

ipcMain.handle('deposit:save', async (event, depositData) => {
  console.log('Saving deposit:', depositData);
  return { success: true };
});

ipcMain.handle('pettycash:save', async (event, pettyCashData) => {
  console.log('Saving petty cash:', pettyCashData);
  return { success: true };
});
