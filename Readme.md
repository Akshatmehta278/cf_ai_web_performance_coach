# Cloudflare AI Chat Application

A fully-featured AI-powered chat application built on Cloudflare's platform, demonstrating all required components for the assignment.

## ✅ Assignment Requirements

This project includes all required components:

1. **LLM Integration**: Workers AI with Llama 3.3 70B model
2. **Workflow/Coordination**: Request orchestration, state management, and API coordination
3. **User Input**: Real-time chat interface with instant feedback
4. **Memory/State**: Persistent conversation history using D1 database and Durable Objects

## 🏗️ Architecture

```
┌─────────────────┐
│  Cloudflare     │
│  Pages          │ ← Frontend (HTML/JS/CSS)
└────────┬────────┘
         │
┌────────▼────────┐
│  Cloudflare     │
│  Workers        │ ← API endpoints, routing
└────────┬────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    │         │             │              │
┌───▼───┐ ┌──▼──┐ ┌────────▼──────┐ ┌────▼─────┐
│Workers│ │ D1  │ │    Durable    │ │ Workflows│
│  AI   │ │ DB  │ │    Objects    │ │(optional)│
└───────┘ └─────┘ └───────────────┘ └──────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Cloudflare account
- Wrangler CLI installed

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd cloudflare-ai-chat
```

2. **Install dependencies**
```bash
npm install
```

3. **Create D1 Database**
```bash
wrangler d1 create chat_history
```

Copy the database ID from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "chat_history"
database_id = "your-database-id-here"
```

4. **Initialize database schema**
```bash
wrangler d1 execute chat_history --file=./schema.sql
```

5. **Run locally**
```bash
npm run dev
```

Visit `http://localhost:8787` to test the application.

6. **Deploy to production**
```bash
npm run deploy
```

## 📁 Project Structure

```
cloudflare-ai-chat/
├── wrangler.toml           # Cloudflare configuration
├── package.json            # Dependencies
├── schema.sql              # D1 database schema
├── src/
│   └── index.js           # Worker entry point with:
│                          # - API endpoints
│                          # - Workers AI integration
│                          # - D1 database operations
│                          # - Durable Objects class
├── public/
│   └── index.html         # Frontend chat interface
└── README.md              # This file
```

## 🔑 Key Features

### 1. Workers AI Integration
- Uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` model
- Supports conversation context
- Configurable temperature and token limits

### 2. Persistent Memory (D1 Database)
- Stores complete conversation history
- Fast session-based retrieval
- Indexed for performance

### 3. Alternative Storage (Durable Objects)
- Session-based state management
- Strong consistency guarantees
- Automatic cleanup

### 4. Real-time Chat Interface
- Responsive design with Tailwind CSS
- Message history with timestamps
- Loading states and error handling
- Session management

## 🛠️ API Endpoints

### POST `/api/chat`
Send a message and get AI response
```json
{
  "message": "Hello!",
  "sessionId": "session_123",
  "conversationHistory": []
}
```

### GET `/api/history?sessionId=xxx`
Retrieve conversation history

### DELETE `/api/history?sessionId=xxx`
Clear conversation history

## 🎯 Core Technologies

- **Cloudflare Workers**: Serverless compute
- **Workers AI**: LLM inference with Llama 3.3
- **D1 Database**: Serverless SQL database
- **Durable Objects**: Stateful coordination
- **Cloudflare Pages**: Static hosting (optional)

## 🔧 Configuration

Edit `wrangler.toml` to customize:
- Model selection
- Database bindings
- Environment variables
- Durable Objects

## 📊 Database Schema

The application uses two tables:

**conversations**: Store complete session data
- session_id, messages, created_at, updated_at

**messages**: Individual message tracking
- session_id, role, content, timestamp

## 🚦 Development Workflow

1. Make changes to `src/index.js` or `public/index.html`
2. Test locally with `npm run dev`
3. Deploy with `npm run deploy`
4. Check logs with `wrangler tail`

## 📝 Assignment Checklist

- [x] LLM integration (Workers AI + Llama 3.3)
- [x] Workflow/coordination (API orchestration, state management)
- [x] User input (Real-time chat interface)
- [x] Memory/state (D1 Database + Durable Objects)
- [x] Production-ready code
- [x] Complete documentation

## 🎓 Learning Resources

- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## 📄 License

MIT

## 👤 Author

Your Name - [GitHub Profile]

---

**Note**: This is a demonstration project for the Cloudflare AI application assignment. It showcases all required components in a production-ready implementation.