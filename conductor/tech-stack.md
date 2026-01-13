# Technology Stack

## Core Technologies
- **Language:** TypeScript
- **Frontend/Build:** Vite
- **Storage:** IndexedDB (via `idb` library)
- **AI/LLM:** WebLLM (@mlc-ai/web-llm), Hugging Face Transformers (@huggingface/transformers)
  - 使用モデル: Llama-3 (WebLLM), Whisper (Xenova/whisper-tiny via Transformers.js)

## APIs
- **Voice:** Web Speech API (SpeechRecognition)
- **Audio:** MediaRecorder API

## Development & Quality Assurance
- **Testing:** Jest, ts-jest, fast-check (Property-based testing)
- **Linting & Formatting:** Biome
- **Git Hooks:** Lefthook, Commitlint
- **CI/CD Readiness:** TypeScript strict mode, integrated test suites
