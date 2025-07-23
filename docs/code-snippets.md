# コード集

このページは、デモンストレーションで使用するコードスニペットをまとめたものです。

## 題材となる関数

### `getCompanyAttentionLevel` (初期状態)

```typescript
export function getCompanyAttentionLevel(newsCount: number): '高' | '中' | '低' {
  if (newsCount >= 20) {
    return '高';
  } else if (newsCount >= 5) {
    return '中';
  } else {
    return '低';
  }
}
```

### `getCompanyAttentionLevel` (仕様変更後)

```typescript
export function getCompanyAttentionLevel(newsCount: number): '超高' | '高' | '中' | '低' {
  if (newsCount >= 50) {
    return '超高';
  } else if (newsCount >= 30) {
    return '高';
  } else if (newsCount >= 5) {
    return '中';
  } else {
    return '低';
  }
}
```
---

## 生成されるテストコード

### 初回生成されるテスト

```typescript
import { getCompanyAttentionLevel } from './companyAnalysis';
import { describe, it, expect } from 'vitest';

describe('getCompanyAttentionLevel', () => {
  it('ニュースが20件以上の場合、高を返す', () => {
    expect(getCompanyAttentionLevel(25)).toBe('高');
  });

  it('ニュースが5件以上20件未満の場合、中を返す', () => {
    expect(getCompanyAttentionLevel(10)).toBe('中');
  });

  it('ニュースが5件未満の場合、低を返す', () => {
    expect(getCompanyAttentionLevel(3)).toBe('低');
  });
});
```

### 仕様変更後に更新されるテスト

```typescript
import { getCompanyAttentionLevel } from './companyAnalysis';
import { describe, it, expect } from 'vitest';

describe('getCompanyAttentionLevel', () => {
  it('ニュースが50件以上の場合、超高を返す', () => {
    expect(getCompanyAttentionLevel(55)).toBe('超高');
  });

  it('ニュースが30件以上50件未満の場合、高を返す', () => {
    expect(getCompanyAttentionLevel(35)).toBe('高');
  });

  it('ニュースが5件以上30件未満の場合、中を返す', () => {
    expect(getCompanyAttentionLevel(15)).toBe('中');
  });

  it('ニュースが5件未満の場合、低を返す', () => {
    expect(getCompanyAttentionLevel(4)).toBe('低');
  });
});
```