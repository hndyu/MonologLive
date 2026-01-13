# Plan: Summary Generation Integration & Persistence

## Phase 1: Gemini API Integration [checkpoint: c7f0a21]
Gemini API を使用して高品質なサマリーを生成する基盤を構築します。

- [x] Task: Gemini API クライアントの実装（`src/summary/gemini-client.ts`）。要約、トピック、インサイト用のプロンプト設計を含む。 [2fb1e09]
- [x] Task: `SummaryGeneratorImpl` を更新し、Gemini API を呼び出すロジックを追加。失敗時の Basic 実装へのフォールバックを実装。 [42268fe]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Gemini Integration' (Protocol in workflow.md)

## Phase 2: Persistence & Session Manager Extension [checkpoint: c82faa5]
生成されたサマリーを IndexedDB に確実に保存し、整合性を保ちます。

- [x] Task: `IndexedDBWrapper` および `SessionManagerImpl` を確認・拡張し、サマリーデータの永続化を確実にする。 [c82faa5]
- [x] Task: 保存されたサマリーを再取得するためのテストと実装。 [c82faa5]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Persistence' (Protocol in workflow.md)

## Phase 3: UI Enhancements & Markdown Export
ユーザーがサマリーを確認し、外部に持ち出せるようにします。

- [x] Task: `SessionSummary` を Markdown 形式に変換し、ブラウザでダウンロードさせる `MarkdownExporter` ユーティリティの実装。 [8791ca3]
- [~] Task: `SessionSummaryUI` を更新。Gemini API のリッチな回答を表示し、「Markdown で保存」ボタンを追加。API 呼び出し中のローディング表示も実装。
- [ ] Task: Gemini API キーを安全に設定・保持する仕組み。
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI and Export' (Protocol in workflow.md)
