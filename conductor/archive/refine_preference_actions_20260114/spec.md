# Specification: Refine Preference Management Actions

## 1. Overview
User Preference Management UI (`PreferenceManagementUI`) における、設定リセット（Reset）およびデータ更新（Refresh）ボタンの配置とスタイルを見直します。
現状、定期的な自動更新が行われているため Refresh ボタンは不要であり、また Reset ボタンは学習データに紐づく機能であるため、AI 設定（API Key 等）から切り離した適切な位置へ移動します。

## 2. Functional Requirements
- **Refresh ボタンの削除**
  - UI から Refresh ボタンを完全に削除する。
  - ボタンに関連付けられていたイベントリスナー（`updateDisplay` の呼び出し）を削除する。
- **Reset ボタンの配置変更**
  - Reset ボタンを `preference-actions` 領域から `Learning Statistics` セクションの直後（`AI Settings` 見出しの直前）に移動する。
- **Reset ボタンのスタイル変更**
  - 現在の目立つ赤色の背景ボタンから、より控えめな枠線のみ（outlined）またはテキストリンクに近いスタイルに変更する。
- **レイアウトの整理**
  - 最下部のボタン領域（`.preference-actions`）を削除し、すべての要素を `.preference-content` 内に収める。

## 3. Non-Functional Requirements
- **既存機能の維持**
  - リセット実行時の確認ダイアログおよび `preferenceLearning.resetPreferences` の呼び出し機能は維持する。
- **デザインの一貫性**
  - 他の UI 要素（カード形式の統計情報や入力フィールド）と調和するデザインを維持する。

## 4. Acceptance Criteria
- [ ] UI 最下部に Refresh ボタンが表示されないこと。
- [ ] Reset ボタンが「AI Settings」見出しの直上に配置されていること。
- [ ] Reset ボタンのスタイルが、以前の塗りつぶしボタンではなく控えめなデザインになっていること。
- [ ] Reset ボタンをクリックした際、確認ダイアログが表示され、承諾後にデータがリセットされること。
- [ ] `.preference-actions` クラスの HTML 要素および関連する CSS 定義がクリーンアップされていること。

## 5. Out of Scope
- 学習アルゴリズム自体の変更。
- API Key 入力フィールドなど、他の AI 設定項目の機能変更。
