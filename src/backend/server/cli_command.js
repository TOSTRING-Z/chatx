const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const express = require("express");
const expressWs = require("express-ws");

let mainWindow;

function cliCommand(command, path) {
    const process = spawn(command, { shell: true, cwd: path });

    process.stdout.on('data', (data) => {
        const formattedData = data.toString()
        mainWindow.webContents.send('terminal-data', formattedData);
    });

    process.stderr.on('data', (data) => {
        const formattedData = data.toString()
        mainWindow.webContents.send('terminal-data', formattedData);
    });

    process.on('close', (code) => {
        // Do not display exit code
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js'),
            devTools: true
        },
    });

    // Open DevTools automatically
    mainWindow.webContents.openDevTools();

    mainWindow.loadFile('index.html');

    ipcMain.on('terminal-input', (event, input) => {
        cliCommand(input.command, input.path);
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