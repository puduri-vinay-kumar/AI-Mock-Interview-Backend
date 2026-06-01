# AI Powered Mock Interview Platform Backend

Production-oriented backend for an AI Powered Mock Interview Platform, built with Node.js, Express, MongoDB, Mongoose, Socket.io, and OpenAI-ready service modules. This repo now includes the advanced backend phase: real AI service architecture, adaptive interview flow, resume parsing, sockets, voice hooks, coding evaluation architecture, and richer reporting.

## Core Stack

- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- OpenAI API
- Gemini API
- Socket.io
- pdf-parse
- mammoth
- multer
- express-validator
- express-rate-limit

## Highlights

- Modular OpenAI integration through a reusable service layer
- AI-powered question generation with fallback behavior when no API key is configured
- Semantic answer evaluation and feedback generation
- Adaptive difficulty and topic progression engine
- Interview session state tracking for REST and realtime flows
- Socket.io events for live interview sessions
- Resume parsing for PDF and DOCX with AI-enhanced extraction
- Voice architecture for speech-to-text and text-to-speech
- Coding and Verilog evaluation architecture
- Rich interview report generation with topic scores and radar metrics

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
MAX_FILE_SIZE=5242880
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
GEMINI_TTS_VOICE=Kore
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
ENABLE_MOCK_AI_FALLBACK=true
INTERVIEW_MAX_QUESTIONS=6
VOICE_OUTPUT_DIR=uploads/voice
```

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── prompts/
│   ├── routes/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── openai.service.js
│   │   │   ├── questionGenerator.js
│   │   │   ├── answerEvaluator.js
│   │   │   ├── feedbackGenerator.js
│   │   │   ├── scoringEngine.js
│   │   │   ├── resumeAnalyzer.js
│   │   │   ├── adaptiveEngine.js
│   │   │   ├── reportGenerator.js
│   │   │   ├── promptTemplates.js
│   │   │   └── voice/
│   │   ├── coding/
│   │   └── interview/
│   ├── sockets/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
├── uploads/
├── .env
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## REST Endpoints

Interactive API docs:

- `GET /api/docs`
- `GET /api/docs.json`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Users

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `GET /api/users/history`

### Interviews

- `POST /api/interviews/create`
- `POST /api/interviews/:id/answer`
- `POST /api/interviews/:id/transcript`
- `POST /api/interviews/:id/complete`
- `GET /api/interviews/:id`
- `GET /api/interviews/history`
- `PUT /api/interviews/:id/status`

### Reports

- `GET /api/reports/:id`
- `GET /api/reports/user/:userId`

### Upload

- `POST /api/upload/resume`

### Voice

- `POST /api/voice/transcribe`
- `POST /api/voice/speak`
- `POST /api/voice/session`

### Coding

- `POST /api/coding/evaluate`
- `POST /api/coding/verilog/evaluate`

### System

- `GET /api/system/readiness`

## Socket Events

Client emits:

- `join-interview`
- `user-answer`

Server emits:

- `ai-question`
- `live-feedback`
- `session-ended`
- `session-error`

## Advanced Service Notes

### OpenAI Integration

- `src/services/ai/openai.service.js` wraps the official OpenAI Node SDK.
- Structured JSON responses are requested through the Responses API.
- Audio transcription uses the transcription API.
- TTS uses the speech API and writes generated audio into `uploads/voice`.

### Gemini Integration

- `src/services/ai/gemini.service.js` wraps the official Google GenAI SDK.
- `src/services/ai/provider.service.js` selects Gemini or OpenAI based on env and key availability.
- Structured outputs use Gemini JSON schema mode.
- Audio transcription uses Gemini file upload plus `generateContent`.
- TTS uses Gemini audio output and writes `.wav` files into `uploads/voice`.

### Resume Parsing

- PDFs are parsed with `pdf-parse`
- DOCX files are parsed with `mammoth`
- Extracted text is optionally enhanced with OpenAI structured extraction
- Fallback extraction still works without an API key

### Adaptive Interviews

- Difficulty rises after strong answers
- Difficulty drops after weak answers
- Repeated weak performance can trigger topic rotation
- Session state stores topic flow, transcript, and adaptive history

### Coding and Voice

- Coding services are scaffolded for JavaScript, Python, C++, Java, and Verilog
- Voice services are modular and ready for Whisper/TTS integration via OpenAI
- Current Verilog and code execution logic is architectural and partially mocked by design
- REST endpoints now exist for speech transcription, TTS generation, and coding evaluation

## Deployment

This repo now includes:

- [Dockerfile](/C:/AI%20Mock%20Interview/backend/Dockerfile)
- [.dockerignore](/C:/AI%20Mock%20Interview/backend/.dockerignore)
- [.env.example](/C:/AI%20Mock%20Interview/backend/.env.example)
- [railway.toml](/C:/AI%20Mock%20Interview/backend/railway.toml)
- [render.yaml](/C:/AI%20Mock%20Interview/backend/render.yaml)

Typical container run flow:

```bash
docker build -t ai-mock-interview-backend .
docker run -p 5000:5000 --env-file .env ai-mock-interview-backend
```

## Railway Deployment

This backend is prepared for Railway with:

- Docker-based deploys
- healthcheck path: `/api/health`
- restart policy configured in `railway.toml`
- dynamic port support through `process.env.PORT`

### Deploy Steps

1. Push this backend to GitHub.
2. In Railway, create a new project and choose `Deploy from GitHub repo`.
3. Select this backend repository.
4. Railway will detect the `Dockerfile` and use it automatically.
5. In the Railway service variables tab, import or paste the variables from `.env.example`.
6. Replace placeholder values with your real secrets.
7. Deploy the service.

### Required Railway Variables

- `MONGO_URI`
- `JWT_SECRET`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`

### Recommended Railway Variables

- `NODE_ENV=production`
- `CLIENT_URL=<your frontend url later>`
- `SOCKET_CORS_ORIGIN=<your frontend url later>`
- `GEMINI_MODEL=gemini-3.5-flash`
- `GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview`
- `GEMINI_TTS_VOICE=Kore`
- `INTERVIEW_MAX_QUESTIONS=6`
- `MAX_FILE_SIZE=5242880`

### Important Railway Notes

- Railway provides `PORT` automatically, and this backend already uses it.
- Railway variables must be reviewed and deployed after changes before they take effect.
- Railway uses ephemeral disk by default, so uploaded resumes and generated voice files are not durable across redeploys. For production persistence, move uploads to object storage later.
- If your frontend is deployed separately, update `CLIENT_URL` and `SOCKET_CORS_ORIGIN` after you know the final frontend domain.

## Render Deployment

This backend is also prepared for Render with:

- Docker-based deploys from the repo `Dockerfile`
- free web service compatibility
- healthcheck path: `/api/health`
- optional Blueprint config in `render.yaml`

### Render Deploy Steps

1. Go to Render and click `New > Blueprint` or `New > Web Service`.
2. Connect your GitHub repo: `AI-Mock-Interview-Backend`.
3. If using `Blueprint`, Render can read `render.yaml` automatically.
4. If using `Web Service` manually:
   - Environment: `Docker`
   - Branch: `main`
   - Instance type: `Free`
5. Add the required environment variables listed below.
6. Deploy the service.

### Required Render Variables

- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CLIENT_URL`
- `SOCKET_CORS_ORIGIN`

### Recommended Render Variables

- `NODE_ENV=production`
- `AI_PROVIDER=gemini`
- `JWT_EXPIRES_IN=7d`
- `COOKIE_SECURE=true`
- `MAX_FILE_SIZE=5242880`
- `GEMINI_MODEL=gemini-3.5-flash`
- `GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview`
- `GEMINI_TTS_VOICE=Kore`
- `INTERVIEW_MAX_QUESTIONS=6`

### Important Render Notes

- Render free web services spin down after 15 minutes of no inbound traffic and may take about a minute to wake up again.
- Render free services use an ephemeral filesystem, so uploaded files and generated voice files are not durable.
- Render expects your app to bind on `0.0.0.0` and usually defaults to port `10000`; this backend already supports `process.env.PORT`.
- Render automatically provides useful runtime variables such as `RENDER_EXTERNAL_URL` and `RENDER_EXTERNAL_HOSTNAME`.

## Security

- Helmet enabled
- CORS configured
- JWT-protected REST and socket flows
- Rate limiting for API, auth, and upload endpoints
- Upload MIME and size validation

## Current Limitations

- OpenAI-backed features require `OPENAI_API_KEY`
- Gemini-backed features require `GEMINI_API_KEY`
- When no provider API key is present, deterministic fallback logic is used
- Realtime voice streaming is architected but not fully wired to chunked audio transport yet
- Code execution is mocked and should later be isolated in sandboxed workers

## Recommended Next Steps

1. Add dedicated interview session endpoints for incremental answer submission and transcript ingest.
2. Move realtime session state to Redis for horizontal scaling.
3. Queue heavy AI/report jobs with BullMQ.
4. Add Swagger or OpenAPI docs.
5. Add integration tests for auth, uploads, sockets, and AI flows.
