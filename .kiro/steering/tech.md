# 技術ガイドライン

## アーキテクチャ原則

### 全体設計
- **モジュラー設計**: 独立したコンポーネントによる疎結合アーキテクチャ
- **型安全性**: TypeScriptによる厳密な型定義と検証
- **テスト駆動**: 単体テストとプロパティベーステストの包括的カバレッジ
- **パフォーマンス重視**: 効率的なリソース使用と最適化

### 技術スタック

#### フロントエンド
- **TypeScript**: 型安全性とコード品質の確保
- **Vite**: 高速な開発とビルド環境
- **Web APIs**: ネイティブブラウザ機能の活用
  - Web Speech API (音声認識)
  - MediaRecorder API (音声録音)
  - IndexedDB (ローカルストレージ)

#### AI/ML統合
- **WebLLM**: ブラウザ内でのローカルLLM実行
- **Transformers.js**: 軽量なML処理
- **Whisper (オプション)**: 高精度音声転写

#### テスト環境
- **Jest**: 単体テストフレームワーク
- **fast-check**: プロパティベーステスト
- **jsdom**: ブラウザ環境シミュレーション

## コーディング標準

### TypeScript規約
```typescript
// インターフェース定義は明確で拡張可能に
interface VoiceInputConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

// 型ガードの使用
function isValidTranscription(result: any): result is TranscriptionResult {
  return result && typeof result.text === 'string' && typeof result.confidence === 'number';
}

// エラーハンドリングの統一
class VoiceInputError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'VoiceInputError';
  }
}
```

### ファイル構造規約
```
src/
├── types/           # 型定義
├── interfaces/      # インターフェース定義
├── [feature]/       # 機能別ディレクトリ
│   ├── index.ts     # エクスポート集約
│   ├── *.ts         # 実装ファイル
│   └── *.test.ts    # テストファイル
└── main.ts          # エントリーポイント
```

### 命名規約
- **ファイル**: kebab-case (`voice-input-manager.ts`)
- **クラス**: PascalCase (`VoiceInputManager`)
- **インターフェース**: PascalCase (`VoiceInputConfig`)
- **変数/関数**: camelCase (`startRecording`)
- **定数**: UPPER_SNAKE_CASE (`MAX_RECORDING_DURATION`)

## テスト戦略

### プロパティベーステスト
```typescript
// 普遍的な性質をテスト
it('Property: Voice input should maintain session continuity', () => {
  fc.assert(fc.property(
    fc.record({
      sessionId: fc.string(),
      isActive: fc.boolean(),
      config: fc.record({
        language: fc.string(),
        continuous: fc.boolean()
      })
    }),
    (input) => {
      const manager = new VoiceInputManager(input.config);
      const result = manager.processSession(input);
      expect(result.sessionId).toBe(input.sessionId);
    }
  ));
});
```

### 単体テスト
```typescript
// 具体的な例とエッジケースをテスト
describe('VoiceInputManager', () => {
  it('should handle empty transcription gracefully', () => {
    const manager = new VoiceInputManager(defaultConfig);
    const result = manager.processTranscription('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## パフォーマンス最適化

### メモリ管理
- **オブジェクトプール**: 頻繁に作成されるオブジェクトの再利用
- **ガベージコレクション**: 適切なリソース解放
- **メモリリーク防止**: イベントリスナーとタイマーの適切なクリーンアップ

### 非同期処理
```typescript
// Promise-basedな非同期処理
async function processAudioChunk(chunk: AudioBuffer): Promise<TranscriptionResult> {
  try {
    const result = await transcriptionService.process(chunk);
    return result;
  } catch (error) {
    throw new TranscriptionError('Failed to process audio chunk', error);
  }
}

// 適切なエラーハンドリング
const processWithRetry = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
```

### ローカルストレージ最適化
```typescript
// IndexedDB効率的使用
class StorageManager {
  private async batchWrite(items: StorageItem[]): Promise<void> {
    const transaction = this.db.transaction(['items'], 'readwrite');
    const store = transaction.objectStore('items');
    
    await Promise.all(items.map(item => store.put(item)));
    await transaction.complete;
  }
}
```

## セキュリティとプライバシー

### データ保護
- **ローカル処理優先**: 音声データの外部送信を最小限に
- **暗号化**: 機密データの適切な暗号化
- **データ最小化**: 必要最小限のデータのみ収集・保存

### エラーハンドリング
```typescript
// セキュアなエラー処理
class SecureErrorHandler {
  static handle(error: Error, context: string): void {
    // 本番環境では詳細なエラー情報を隠蔽
    const sanitizedError = process.env.NODE_ENV === 'production' 
      ? new Error('An error occurred')
      : error;
    
    console.error(`[${context}]`, sanitizedError);
    // ユーザーフレンドリーなエラーメッセージを表示
  }
}
```

## 依存関係管理

### 外部ライブラリ
- **最小限の依存**: 必要最小限のライブラリのみ使用
- **セキュリティ監査**: 定期的な脆弱性チェック
- **ライセンス確認**: オープンソースライセンスの適切な管理

### バージョン管理
- **セマンティックバージョニング**: 適切なバージョン番号付け
- **後方互換性**: 破壊的変更の慎重な管理
- **依存関係固定**: package-lock.jsonによる確定的ビルド

## デプロイメントと運用

### ビルド最適化
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@mlc-ai/web-llm'],
          utils: ['idb']
        }
      }
    },
    target: 'es2020',
    minify: 'terser'
  }
});
```

### 監視とログ
- **パフォーマンス監視**: Core Web Vitalsの追跡
- **エラー追跡**: 適切なエラーログとアラート
- **使用状況分析**: プライバシーを尊重した匿名化データ収集