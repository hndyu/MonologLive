# プロジェクト構造ガイドライン

## ディレクトリ構造

### 推奨プロジェクト構造
```
monolog-live/
├── .kiro/                          # Kiro設定とスペック
│   ├── specs/                      # 機能仕様書
│   │   └── monolog-live/          # メイン機能スペック
│   └── steering/                   # ステアリングルール
├── src/                           # ソースコード
│   ├── types/                     # 型定義
│   ├── interfaces/                # インターフェース定義
│   ├── audio/                     # 音声関連機能
│   ├── comment-generation/        # コメント生成システム
│   ├── error-handling/            # エラーハンドリング
│   ├── learning/                  # 学習・パーソナライゼーション
│   ├── performance/               # パフォーマンス最適化
│   ├── session/                   # セッション管理
│   ├── storage/                   # ストレージ管理
│   ├── summary/                   # 要約生成
│   ├── transcription/             # 転写機能
│   ├── ui/                        # ユーザーインターフェース
│   ├── voice/                     # 音声入力管理
│   └── main.ts                    # エントリーポイント
├── tests/                         # テストファイル
├── dist/                          # ビルド出力
└── 設定ファイル群
```

## モジュール設計原則

### 機能別モジュール構成
各機能モジュールは以下の構造に従う：

```
[feature]/
├── index.ts                       # エクスポート集約
├── [feature]-manager.ts           # メイン管理クラス
├── [feature]-types.ts             # 型定義（必要に応じて）
├── [feature]-utils.ts             # ユーティリティ関数
└── [feature].test.ts              # テストファイル
```

### 依存関係の方向性
```
UI Layer (ui/)
    ↓
Business Logic Layer (各機能モジュール)
    ↓
Data Layer (storage/, interfaces/)
    ↓
Core Types (types/)
```

## ファイル命名規約

### TypeScriptファイル
- **実装ファイル**: `kebab-case.ts`
- **テストファイル**: `kebab-case.test.ts` または `kebab-case.property.test.ts`
- **型定義ファイル**: `kebab-case.d.ts`
- **インターフェース**: `kebab-case.ts` (interfacesディレクトリ内)

### 例
```
voice-input-manager.ts              # 実装
voice-input-manager.test.ts         # 単体テスト
voice-input.property.test.ts        # プロパティベーステスト
voice-input.d.ts                    # 型定義
```

## インポート/エクスポート規約

### エクスポート戦略
```typescript
// index.ts - 各モジュールのエクスポート集約
export { VoiceInputManager } from './voice-input-manager';
export { AudioRecorder } from './audio-recorder';
export type { VoiceInputConfig, AudioConfig } from './types';

// 名前付きエクスポートを優先
export class VoiceInputManager {
  // 実装
}

// デフォルトエクスポートは避ける（特別な理由がない限り）
```

### インポート順序
```typescript
// 1. Node.jsモジュール
import { EventEmitter } from 'events';

// 2. 外部ライブラリ
import { openDB } from 'idb';

// 3. 内部モジュール（相対パス順）
import { VoiceInputConfig } from '../interfaces/voice-input';
import { StorageManager } from '../storage';
import { ErrorHandler } from './error-handler';

// 4. 型のみのインポート
import type { TranscriptionResult } from '../types/core';
```

## コード組織化パターン

### クラス設計
```typescript
// 単一責任の原則に従ったクラス設計
export class VoiceInputManager {
  private config: VoiceInputConfig;
  private recognition: SpeechRecognition | null = null;
  private eventEmitter: EventEmitter;

  constructor(config: VoiceInputConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
  }

  // パブリックメソッド
  public async start(): Promise<void> {
    // 実装
  }

  public stop(): void {
    // 実装
  }

  // プライベートメソッド
  private setupRecognition(): void {
    // 実装
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    // 実装
  }
}
```

### インターフェース設計
```typescript
// interfaces/voice-input.ts
export interface VoiceInputConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
}

export interface VoiceInputEvents {
  transcription: (result: TranscriptionResult) => void;
  error: (error: Error) => void;
  start: () => void;
  end: () => void;
}
```

## テストファイル構造

### 単体テスト
```typescript
// voice-input-manager.test.ts
import { VoiceInputManager } from './voice-input-manager';
import { mockSpeechRecognition } from '../test-utils/mocks';

describe('VoiceInputManager', () => {
  let manager: VoiceInputManager;
  
  beforeEach(() => {
    manager = new VoiceInputManager(defaultConfig);
  });

  describe('start()', () => {
    it('should initialize speech recognition', async () => {
      // テスト実装
    });
  });

  describe('error handling', () => {
    it('should handle recognition errors gracefully', () => {
      // テスト実装
    });
  });
});
```

### プロパティベーステスト
```typescript
// voice-input.property.test.ts
import * as fc from 'fast-check';
import { VoiceInputManager } from './voice-input-manager';

describe('VoiceInputManager Properties', () => {
  it('Property: Continuous voice input maintains session continuity', () => {
    fc.assert(fc.property(
      fc.record({
        language: fc.constantFrom('en-US', 'ja-JP'),
        continuous: fc.boolean(),
        interimResults: fc.boolean()
      }),
      (config) => {
        const manager = new VoiceInputManager(config);
        // プロパティテスト実装
      }
    ));
  });
});
```

## 設定ファイル管理

### TypeScript設定
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["src/types/*"],
      "@/interfaces/*": ["src/interfaces/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### ビルド設定
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/interfaces': resolve(__dirname, 'src/interfaces')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'MonologLive',
      fileName: 'monolog-live'
    },
    rollupOptions: {
      external: ['idb'],
      output: {
        globals: {
          idb: 'idb'
        }
      }
    }
  }
});
```

## ドキュメント構造

### README構成
1. **プロジェクト概要**: 目的と主要機能
2. **セットアップ**: インストールと開発環境構築
3. **使用方法**: 基本的な使用例
4. **アーキテクチャ**: 高レベル設計概要
5. **開発**: 開発者向け情報
6. **テスト**: テスト実行方法
7. **デプロイ**: 本番環境への展開

### コードコメント
```typescript
/**
 * 音声入力を管理し、リアルタイム転写を提供するクラス
 * 
 * @example
 * ```typescript
 * const manager = new VoiceInputManager({
 *   language: 'ja-JP',
 *   continuous: true,
 *   interimResults: true
 * });
 * 
 * manager.on('transcription', (result) => {
 *   console.log(result.text);
 * });
 * 
 * await manager.start();
 * ```
 */
export class VoiceInputManager {
  /**
   * 音声認識を開始する
   * @throws {VoiceInputError} ブラウザが音声認識をサポートしていない場合
   */
  public async start(): Promise<void> {
    // 実装
  }
}
```

## バージョン管理

### Git構造
```
.gitignore                         # 除外ファイル設定
├── node_modules/                  # 除外
├── dist/                          # 除外
├── .env                          # 除外
└── coverage/                     # 除外
```

### ブランチ戦略
- **main**: 本番リリース用
- **develop**: 開発統合用
- **feature/***: 機能開発用
- **hotfix/***: 緊急修正用

### コミットメッセージ
```
feat: 音声入力管理機能を追加
fix: 転写精度の問題を修正
docs: READMEにセットアップ手順を追加
test: コメント生成のプロパティテストを追加
refactor: ストレージ管理クラスを最適化
```