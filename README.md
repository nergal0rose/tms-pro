# TMS Pro

A native Windows desktop client for the NEPSE Trade Management System (TMS), built using Tauri and Rust.

## Features

- **Multi-Broker Support:** Connect to any NEPSE broker by entering the broker ID.
- **Auto-Login:** Saves your broker preference and redirects you automatically on subsequent launches.
- **Network Validation:** Pings the broker URL before navigation to prevent getting stuck on browser error pages.
- **Switch Broker:** A dedicated button inside the TMS UI to easily return to the selection screen.
- **DP Holdings Panel:** Injects a widget on the trading screen showing your Demat holdings and LTP.
- **Auto-Trade Execution:**
  - Smart fill for quantity and price.
  - Automated confirmation dialog bypassing.
  - Live audit trail logs.
  - Adjustable execution speed settings.
- **Automated Captcha Solving:** Injects OCR scripts to read and fill login captchas automatically.
- **Isolated Environment:** Runs inside a dedicated Tauri webview, separate from standard web browsers.

## Installation

Download the latest `.exe` or `.msi` from the Releases page and run the installer.

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Run locally: `npm run tauri dev`
4. Build executable: `npm run tauri build`

## Architecture

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Rust (Tauri v2)
- **Injection Scripts:** Custom JS payloads (`tms_inject.js`, `mainScriptCaptcha.js`) loaded directly into the webview.

## Screenshots

<details>
<summary>Click to view screenshots</summary>

<img src="Screenshot/Screenshot%202026-06-26%20140355.png" alt="Screenshot 1" width="600"/>
<img src="Screenshot/Screenshot%202026-06-26%20140705.png" alt="Screenshot 2" width="600"/>
<img src="Screenshot/Screenshot%202026-06-26%20140946.png" alt="Screenshot 3" width="600"/>
<img src="Screenshot/Screenshot%202026-06-26%20141207.png" alt="Screenshot 4" width="600"/>
<img src="Screenshot/Screenshot%202026-06-26%20141306.png" alt="Screenshot 5" width="600"/>

</details>

## Disclaimer and License

**Disclaimer:** This project is built strictly for **educational purposes**. The creator and owner of this repository assume no responsibility or liability for any errors, financial losses, issues, or consequences arising from the use of this software. By using this software, you agree that you are using it entirely at your own risk.

**Free Use Policy:** This software is provided free of charge for personal and educational use. 

**License:** MIT License. Note: This is an unofficial client and is not affiliated with the Nepal Stock Exchange (NEPSE).
