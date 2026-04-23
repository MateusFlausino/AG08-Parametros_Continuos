import { app, BrowserWindow } from "electron";
import path from "node:path";
import url from "node:url";

import { startStaticServer } from "../server.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

let mainWindow = null;
let serverInstance = null;

async function createMainWindow() {
  if (!serverInstance) {
    serverInstance = await startStaticServer({ port: 0 });
  }

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: "#173a55",
    title: "Trabalho 2",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(serverInstance.url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function closeServer() {
  if (!serverInstance?.server) {
    return;
  }

  await new Promise((resolve, reject) => {
    serverInstance.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  serverInstance = null;
}

app.whenReady().then(async () => {
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    await closeServer();
    app.quit();
  }
});

app.on("before-quit", async () => {
  await closeServer();
});
