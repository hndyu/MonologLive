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
- **AI Service:** Google Gemini API (Generative AI for summarization)

## Development & Quality Assurance
- **Testing:** Jest, ts-jest, fast-check (Property-based testing)
- **Linting & Formatting:** Biome
- **Git Hooks:** Lefthook, Commitlint
- **CI/CD Readiness:** TypeScript strict mode, integrated test suites

## System Maintenance & Optimization
- **パフォーマンス監視:** `PerformanceMonitor` によるメモリおよび応答時間のリアルタイム監視
- **セキュリティ & プライバシー:**
  - XSS保護: ユーザー入力データの DOM レンダリング時に `textContent` を使用し、悪意のあるスクリプトの実行を防止
  - PII サニタイズ: エラーログ出力時に API キーやトランスクリプトを自動的にマスク
  - LLM 安全性: プロンプトインジェクションを防ぐためのデリミタと指示の最適化
- **最適化:** 
  - `LazyLoader` による重いUIコンポーネント（設定、サマリー等）のオンデマンド読み込み
  - `Whisper (Transformers.js)` の厳密な遅延読み込み: 拡張文字起こしが要求されるまでライブラリ全体をロードせず、初期ロードサイズを削減
  - `AdaptiveBehaviorManager` による負荷に応じた動的設定変更
