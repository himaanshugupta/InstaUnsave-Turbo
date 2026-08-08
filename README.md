# InstaUnsave-Turbo 🚀
> **Bulk Instagram Unsaver** — A lightweight, high-performance Manifest V3 Google Chrome extension to bulk unsave your bookmark collections with style.

---

## ✨ Features

- **3 Speed Modes**:
  - 🟢 **Basic (`Safe & Steady`)**: 250ms settle delay, limit up to 100 posts. Extremely safe.
  - 🔵 **Fast (`Turbo Balanced`)**: 150ms settle delay, limit up to 200 posts. High performance.
  - ⚡ **Flash (`Extreme Speed`)**: 80ms settle delay, unlimited posts. Uses `requestAnimationFrame` timing synchronizations to run at screen paint cycles.
- **Premium Dark UI/UX**:
  - Glassmorphic dark-theme design layout matching modern OS styles.
  - Snappy hardware-accelerated entrance transitions (`0.12s`).
  - Rounded border edges (`12px`) blending with modern system window designs.
- **Dynamic Visual Feedback**:
  - **Inline Status Badge**: Cycles from pulsing neon-blue `Detecting...` during page verification to `Idle` or pulsing neon-green `Running`.
  - **Color-Coded Stats**: Live counts glow dynamically once they are greater than 0 (Unsaved: neon-blue/neon-green, Failed: neon-red, Skipped: neon-yellow), keeping the UI clean at startup.
  - **Live Log Terminal**: A monospace rolling logs panel showcasing the last 5 execution logs.
- **Smart Validation Guidance**:
  - Inline error banners notifying users if they are not on Instagram, not on the Saved bookmark page, or need to select the "All Posts" collection to continue.

---

## 📂 File Structure

```
InstaUnsave-Turbo/
├── manifest.json      # Manifest V3 extension configuration
├── popup.html         # Instantly rendered popup layout
├── popup.css          # Dark theme tokens, animations, and typography
├── popup.js           # Asynchronous controller with parallel loading
├── content.js         # Unified automation execution engine inside the Instagram tab
├── icons/             # Custom blue branded logo assets (16x16, 48x48, 128x128)
└── README.md          # Project guide
```

---

## ⚙️ Installation Guide

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (button in the top-left corner).
4. Select the project directory: `C:\Users\Himanshu Gupta\Desktop\InstaUnsave-Turbo`.
5. Pin **InstaUnsave-Turbo** 🚀 to your extension bar.

---

## 🖱️ How to Use

1. Open Instagram in your browser and go to your **Saved** collections page:  
   `https://www.instagram.com/your_username/saved/`
2. **Important**: Click on the **"All Posts"** collection to display the grid of bookmarked posts.
3. Click the extension toolbar icon. The status badge will briefly pulse blue (`Detecting...`) as it verifies the page status.
4. Select your desired speed mode (Basic, Fast, or Flash).
5. Click **Run Turbo Unsave** to start!
6. Track live logs and counters. Click **Stop Unsaving** anytime to pause or cancel.

---

## 🛠️ Performance Configurations

| Speed Mode | Limit | Settle Wait | Loop Delay | Scroll Pause | Timing Cycle |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic** | 100 posts | 250ms | 400ms | 1200ms | `setTimeout` |
| **Fast** | 200 posts | 150ms | 250ms | 1000ms | `setTimeout` |
| **Flash** | Unlimited | 80ms | 80ms | 600ms | `requestAnimationFrame` |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
