# Implementation Plan: Whisper & Transformers.js Strict Lazy Loading

## Phase 1: 基礎構造のリファクタリングとテスト準備 [checkpoint: bd5f25c]
静的インポートを排除し、非同期ロードを許容する構造へ移行します。

- [x] Task: `src/interfaces/enhanced-transcription.ts` の拡張（ロード状態、エラー状態の定義追加） e92c297
- [x] Task: `WhisperTranscription` の初期化フロー変更 0431869
- [x] Task: Conductor - User Manual Verification '基礎構造のリファクタリングとテスト準備' (Protocol in workflow.md) bd5f25c

## Phase 2: 設定UIの拡張（パフォーマンスセクション）
新しい設定項目と、それらを保持するロジックを実装します。

- [ ] Task: 設定画面の「パフォーマンス」セクションの実装
- [ ] Task: 設定UIの表示テスト
- [ ] Task: Conductor - User Manual Verification '設定UIの拡張' (Protocol in workflow.md)

## Phase 3: 厳密な遅延読み込みの実装と統合
メインアプリケーションからの参照を動的化し、ロード中のUXを統合します。

- [ ] Task: `transcription-integration.ts` の動的ロード化
- [ ] Task: UI側でのロード状態の反映
- [ ] Task: ロード時ヒントの表示
- [ ] Task: Conductor - User Manual Verification '厳密な遅延読み込みの実装と統合' (Protocol in workflow.md)

## Phase 4: バックグラウンド事前ロードと最終調整
アイドル時間を利用した最適化と、全体のポリッシュを行います。

- [ ] Task: バックグラウンド事前ロードロジックの実装
- [ ] Task: `main.ts` からの完全な静的参照削除と動作確認
- [ ] Task: バンドルサイズの確認と最終テスト
- [ ] Task: Conductor - User Manual Verification 'バックグラウンド事前ロードと最終調整' (Protocol in workflow.md)
