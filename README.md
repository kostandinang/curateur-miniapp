# 🦞 OpenClaw Telegram Mini App

A React-based Telegram Mini App for controlling your OpenClaw agent.

## ✨ Features

- **📊 Session Status** — Live model, token usage, context window, cost tracking
- **🛠️ Skills Runner** — One-tap buttons for Loom, Weather, Memory search, and more
- **🎨 Telegram Native UI** — Uses Telegram's theme colors, haptic feedback, native popups

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /root/.openclaw/workspace/miniapp
npm install
```

### 2. Start Dev Server

```bash
npm run dev
```

The app will be at `http://localhost:3000`

### 3. Set Up Telegram Bot

1. Message [@BotFather](https://t.me/BotFather)
2. Send `/newapp` or go to Bot Settings → Menu Button
3. Set menu button URL to your deployed app URL
4. For local testing, use [ngrok](https://ngrok.com):
   ```bash
   ngrok http 3000
   ```
   Then use the ngrok HTTPS URL in BotFather.

### 4. Production Build

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, etc.)

## 📝 BotFather Commands to Add

Send `/setcommands` to [@BotFather](https://t.me/BotFather):

```
menu - Open Control Panel
status - Quick status check
new - New session
help - Show help
```

## 🔌 API Endpoints Used

The app calls these OpenClaw Gateway endpoints:

- `GET /api/status` — Session status
- `POST /api/message` — Send commands to agent
- `POST /api/sessions/new` — Create new session

Make sure your Gateway is running and accessible!

## 🎨 Customization

Edit `src/components/SkillsRunner.jsx` to add more skills:

```javascript
const SKILLS = [
  {
    id: 'my-skill',
    name: 'My Skill',
    emoji: '🚀',
    description: 'Does something cool',
    inputs: [{name: 'param', label: 'Parameter', placeholder: 'Enter value...'}]
  },
  // ...
]
```

## 📁 Project Structure

```
miniapp/
├── src/
│   ├── components/
│   │   ├── SessionStatus.jsx   # Status tab
│   │   └── SkillsRunner.jsx    # Skills tab
│   ├── App.jsx                 # Main app + tabs
│   ├── App.css                 # Telegram-themed styles
│   └── main.jsx                # Entry point
├── index.html                  # HTML template
├── package.json
├── vite.config.js
└── README.md
```

## 🔒 Security Notes

- The auth token in SessionStatus.jsx should come from environment variables in production
- Gateway should be behind HTTPS in production
- Consider adding CORS restrictions to your Gateway

## 🐛 Troubleshooting

**"Gateway not reachable"**
→ Make sure `openclaw gateway` is running

**Commands not sending**
→ Check that the auth token matches your Gateway token

**Theme not matching Telegram**
→ The app reads from `window.Telegram.WebApp` — works only inside Telegram

---

Built with ❤️ for OpenClaw