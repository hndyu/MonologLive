# Specification: Summary Generation Integration & Persistence

## 1. Overview
本トラックでは、セッション終了後のサマリー生成機能を強化し、Gemini APIを利用した高品質な要約、トピック抽出、インサイト提供を実現します。また、生成されたサマリーを IndexedDB に永続化し、ユーザーが Markdown 形式でエクスポートできる機能を実装します。

## 2. Functional Requirements

### 2.1 高性能サマリー生成 (Gemini API 統合)
- セッション終了時に、収集された文字起こしテキスト、トピック、統計情報を Gemini API に送信。
- 以下の 3 点を含む高品質な回答を取得：
    - **セッション要約**: 会話の主要な流れと内容の要約。
    - **主要トピック**: 議論された重要なキーワードやテーマ。
    - **AI インサイト**: ユーザーの価値観や思考の癖に関する気づき、次回の会話への提案。
- Gemini API キーは、環境変数または UI 上の入力フィールド（初期設定用）から取得する構成とする。

### 2.2 サマリーの永続化
- 生成されたサマリーを `SessionSummary` オブジェクトとして IndexedDB に自動保存する。
- 既存の `SessionManager` と `IndexedDBWrapper` を拡張し、セッションデータとサマリーを紐付けて管理する。

### 2.3 ユーザーインターフェースの強化
- `SessionSummaryUI` を更新し、Gemini API からの回答を表示できるようにする。
- サマリー表示モーダルに「Markdown で保存」ボタンを追加。
- 生成中（API 呼び出し中）のローディング状態を表示。

### 2.4 Markdown エクスポート
- サマリー内容を構造化された Markdown 形式でファイル出力（ダウンロード）する機能。

## 3. Non-Functional Requirements
- **エラーハンドリング**: API 制限やネットワークエラー時に、Basic 実装（ルールベース）へフォールバックする仕組み。
- **セキュリティ**: API キーをクライアントサイドで扱う際の最低限の配慮。

## 4. Acceptance Criteria
- セッション終了後、Gemini API を介して要約が生成され、UI に表示されること。
- 生成されたサマリーが IndexedDB に保存され、再表示可能であること。
- 「Markdown で保存」ボタンで `.md` ファイルがダウンロードされること。
- API エラー時に Basic 実装が動作すること。
