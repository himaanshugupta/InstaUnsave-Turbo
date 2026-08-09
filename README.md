# InstaUnsave-Turbo 🚀
> **Bulk Instagram Unsaver** — A lightweight, high-performance Manifest V3 Google Chrome extension to bulk unsave your bookmark collections with style.

---

## ✨ Features

- **3 Speed Modes**:
  - 🔵 **Basic**: Safe and steady. Up to 100 posts.
  - 🟢 **Fast**: Balanced high performance. Up to 200 posts.
  - ⚡ **Flash**: Extreme speed. Unlimited posts. Uses `requestAnimationFrame` timing for blistering fast execution.
- **Premium Dark UI/UX**:
  - Glassmorphic dark-theme design layout matching modern OS styles.
  - **Dynamic Theming**: The entire UI dynamically shifts colors (Blue, Green, Orange) based on your selected speed mode using modern CSS `:has()` selectors.
  - Unselected modes dim out gracefully while the engine is running.
- **Real-Time Speed Telemetry**:
  - Live animated SVG graph plotting your actual unsave speed per second.
  - Graph scaling automatically adjusts depending on the active mode to perfectly center your telemetry line.
  - Smooth 350ms tick updates for an active, realistic wave visualization.
- **Dynamic Visual Feedback**:
  - **Inline Status Badge**: Cycles from pulsing neon `Detecting...` to a glowing `Running` state.
  - **Color-Coded Stats**: Live counts glow dynamically depending on the current mode theme.
  - **Live Log Terminal**: Monospace rolling logs panel showcasing execution state, complete with a blinking LED activity indicator.
- **Smart Validation Guidance**:
  - Inline error banners notifying users if they are not on Instagram, not on the Saved bookmark page, or need to select the "All Posts" collection to continue.

---

## 📂 File Structure

```
InstaUnsave-Turbo/
├── manifest.json      # Manifest V3 extension configuration
├── popup.html         # Instantly rendered popup layout
├── popup.css          # Dark theme tokens, animations, and typography
├── popup.js           # Asynchronous controller with parallel loading & graph rendering
├── content.js         # Unified automation execution engine inside the Instagram tab
├── icons/             # Custom branded logo assets (16, 48, 128px)
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
3. Click the extension toolbar icon. The status badge will briefly pulse as it verifies the page status.
4. Select your desired speed mode (Basic, Fast, or Flash). Notice the UI themes match your choice!
5. Click **Run Turbo Unsave** to start!
6. Track live logs, counters, and watch the real-time speed graph visualize the execution engine. Click **Stop Unsaving** anytime to pause or cancel.

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
