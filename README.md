# 🎮 Medo Game Launcher

### A lightweight Windows desktop app for experimenting with Discord game-activity detection

[⬇️ Download v0.3.1](https://github.com/mghonem2500-tech/DiscordGameLauncher/releases/download/release_0.3.1/Medo.Game.Launcher.Setup.0.3.1.exe) · [📦 View all releases](https://github.com/mghonem2500-tech/DiscordGameLauncher/releases)

---

> **In brief:** Medo Game Launcher creates a local placeholder process for a selected entry in Discord’s detectable-game catalog. It does **not** install or run the actual game.

## ✨ Features

- 🔎 **Browse and search** the available game catalog.
- 🔄 **Refresh the catalog** while keeping the last valid local copy if an update fails.
- ▶️ **Start or stop** a lightweight placeholder process from the launcher.
- 🪟 **Game-specific window title** that displays the selected game name.
- 🌐 **English and Arabic interface**, including right-to-left layout support.
- 💾 **Persistent library and process state**, with safer local file updates and backup recovery.
- 🔗 **Share and shortcut options** for supported library entries.
- ⬆️ **In-app update support** for published releases.

## 🧭 How it works

1. The app loads its local game catalog and can request a refresh from the configured source.
2. Choose a game from the searchable list.
3. The launcher places a copy of its bundled `DummyGame` template in the app’s per-user data folder, using the selected game’s registered executable name and ID.
4. When started, that placeholder runs locally as a lightweight process. Discord **may** recognize its process name as a game activity; detection can vary and is not guaranteed.

The placeholder is not the real game and does not provide gameplay. Activity, Quest, promotion, or reward recognition and completion are not guaranteed.

## 📥 Install

Download the Windows installer from the [v0.3.1 release page](https://github.com/mghonem2500-tech/DiscordGameLauncher/releases/tag/release_0.3.1) and run it. The installer creates the desktop and Start Menu shortcuts configured for the app.

## 🧑‍💻 Build from source

### Requirements

- 🪟 Windows 10 or later, 64-bit
- 🟣 .NET SDK 8.0 or later
- 🟢 Node.js 20 or later with npm

### Build the DummyGame template

From the repository root, publish the template into Electron’s build resources:

```powershell
dotnet publish ./src/DummyGame/DummyGame.csproj -c Release -o ./electron/build-resources/dummygame
```

### Install dependencies and run checks

```powershell
cd ./electron
npm ci
npm run check
npm run validate:template
```

### Create the Windows installer

```powershell
npm run dist
npm run validate:package
```

The installer is written to `electron/dist/` with a filename similar to `Medo.Game.Launcher.Setup.0.3.1.exe`.

To launch the development UI, run `npm start` from the `electron` directory. Publish the DummyGame template first if you want to test starting a placeholder process.

## 🗂️ Local data

The launcher stores its catalog, library settings, process state, and generated placeholder files in Electron’s per-user application-data folder. Placeholder executables are kept under the launcher’s own `games` directory; they are not installed into the original game’s folder.

## ⚠️ Responsible use and disclaimer

This is an independent project and is not affiliated with, endorsed by, or sponsored by Discord Inc., game developers, publishers, or advertisers. Discord and all referenced game names and marks belong to their respective owners.

A simulated process may conflict with Discord’s terms, game policies, or promotional requirements. Use the app only where permitted, and do not present a placeholder process as proof that you are playing a real game. The project does not guarantee Discord activity detection or completion of any Quest, offer, or reward. Use it at your own risk.
