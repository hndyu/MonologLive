# Specification: Fix Whisper Concurrency and Redundant Styles

## 1. Overview
コードレビューでの指摘に基づき、Whisperの遅延読み込みにおける並行処理の問題（レースコンディション）を修正し、リソースの初期化をスレッドセーフにします。また、UIコンポーネントにおけるスタイルの重複追加を防止し、DOMのクリーンさを維持します。

## 2. Functional Requirements

### 2.1 スレッドセーフなリソース初期化
- **`src/main.ts` (`getWhisper`)**:
    - `lazyLoader.loadFeature("enhanced-transcription")` を使用してモジュールをロードする。
    - 複数の呼び出しが同時に発生しても、インスタンス化が1回のみであることを保証する。
- **`src/transcription/transcription-integration.ts` (`initialize`)**:
    - `initializationPromise` を導入し、初期化中に再度呼び出された場合は既存の Promise を返すようにする。
- **`src/transcription/enhanced-transcription.ts` (`loadModel`)**:
    - `loadingPromise` を導入し、モデルロード中に複数のリクエストがあった場合はロード完了を待機させる。
    - ロードに失敗した場合は `loadingPromise` をクリアし、次回の呼び出しで再試行を可能にする。

### 2.2 UIスタイルの重複防止
- **`src/ui/preference-management.ts`**:
    - `applyStyles` メソッド内で、既にスタイルタグ（ID: `preference-management-styles`）が存在するか確認し、存在する場合は追加をスキップする。

## 3. Non-Functional Requirements
- **並行性の保証**: 100ms以内の間隔で発生する複数の非同期呼び出しに対して、期待通りの単一初期化が行われること。
- **堅牢性**: ネットワークエラー等でモデルロードに失敗しても、アプリケーションをリロードせずに再試行できること。

## 4. Acceptance Criteria
- [ ] `getWhisper()` を同時に10回呼び出しても、`WhisperTranscription` のコンストラクタが1回しか実行されない。
- [ ] `transcribeAudio` をモデルロード中に複数呼び出し、すべてが正常に文字起こし結果を返す（またはロード失敗時に適切にエラーになる）。
- [ ] 設定画面を5回開閉した後、`<head>` 内に `preference-management-styles` IDを持つスタイルタグが1つしか存在しない。
- [ ] モデルロード失敗後、再度実行した際に正常にロードが開始される。

## 5. Out of Scope
- Whisperモデル自体の精度向上やサイズ削減。
- WebLLM (Llama-3) 側の初期化ロジックの変更（今回は指摘のあったWhisper/UI関連に限定）。
