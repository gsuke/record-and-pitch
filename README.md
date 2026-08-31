# Record & Pitch

マイクで録音した音声を、ピッチを変更しながら聴ける、シンプルなウェブアプリです！

## 機能

- **録音**: 録音ボタンで録音開始 / 停止（最大5分）
- **波形表示**: 録音した音声の波形を表示
- **再生 / 停止**: 波形左側のボタンで再生・停止を切り替え
- **ピッチ変更**: -12 ～ +12 半音の範囲で調整可能
- **音量変更**: 0% ～ 1000% の範囲で調整可能（スライダー ± ボタン）
- **ダークモード**: OS の設定に応じて自動適用

## 対応ブラウザ

- Google Chrome
- Mozilla Firefox

> ※ Safari / iOS には対応していません。

## 技術スタック

- **React 19** + TypeScript
- **Tailwind CSS v4** + shadcn/ui
- **soundtouchjs** — ピッチ変更ライブラリ
- **Vite+** — ビルドツール

## セットアップ

```bash
vp install
vp dev      # 開発サーバー起動
vp build    # プロダクションビルド
vp preview  # ビルド結果をプレビュー
```

## プロジェクト構成

```
src/
├── App.tsx                # メインアプリ + audio state
├── audio.ts               # AudioController（録音・再生・ピッチ制御）
├── components/
│   ├── PlayPauseButton.tsx   # 再生/停止ボタン
│   ├── RecordButton.tsx      # 録音ボタン
│   ├── VolumeControl.tsx     # 音量スライダー
│   ├── PitchControl.tsx      # ピッチスライダー
│   ├── Waveform.tsx          # 波形Canvas描画
│   └── ui/
│       └── slider.tsx        # スライダー基盤コンポーネント
└── style.css             # Tailwind v4 テーマ設定
```

## アーキテクチャメモ

- `audio.ts` は React に依存しない独立したクラスとして実装
- React との連携は `useSyncExternalStore` + `subscribeState` / `subscribeTime` pattern
- 波形・再生位置の描画は `requestAnimationFrame` + DOM 直接操作で実現（React 再レンダーを回避）
- ピッチ・音量スライダーは React コンポーネントとして実装（`useSyncExternalStore` で state 同期）
