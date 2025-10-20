# Toreka Tracker

Webサイトのコメント欄を監視し、新規コメントや返信をDiscord Webhookで通知するシステムです。

## 機能

- ✅ 最新2ページのコメントを定期監視（デフォルト: 1分毎）
- ✅ 新規コメントと返信を自動検出
- ✅ Discord Webhookで美しい通知
- ✅ SQLiteによる重複検出
- ✅ 軽量・高速（Node.js + TypeScript）
- ✅ Docker対応

## システム要件

- Node.js 20以上
- Docker & Docker Compose（本番環境推奨）

## セットアップ

### 1. Discord Webhookの作成

1. Discordサーバーで通知を送りたいチャンネルを開く
2. チャンネル設定 → 連携サービス → ウェブフック
3. 「新しいウェブフック」をクリック
4. Webhook URLをコピー

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
TARGET_URL=https://gamenv.net/tc/yodobashi/
SCRAPE_INTERVAL_MINUTES=1
LOG_LEVEL=info
```

### 3. ローカル開発

```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# 開発モードで起動
npm run dev

# 本番モードで起動
npm start
```

### 4. Docker での起動（推奨）

```bash
# ビルドと起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

## Oracle Cloud へのデプロイ

### 前提条件

- Oracle Cloud Free Tier アカウント
- VM インスタンス（Ubuntu 22.04 推奨）

### デプロイ手順

#### 1. VM インスタンスの作成

1. Oracle Cloud コンソールにログイン
2. Compute → Instances → Create Instance
3. Shape: VM.Standard.E2.1.Micro (Always Free)
4. OS: Ubuntu 22.04
5. SSH キーを設定してインスタンスを作成

#### 2. VM への接続

```bash
ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_IP
```

#### 3. Docker のインストール

```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# Docker インストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose インストール
sudo apt install docker-compose -y

# 再ログイン
exit
ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_IP
```

#### 4. プロジェクトのデプロイ

```bash
# プロジェクトのクローン（またはファイル転送）
git clone https://github.com/youhyun0730/toreka-tracker toreka-tracker
cd toreka-tracker

# 環境変数の設定
nano .env
# Discord Webhook URL などを設定

# 起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

#### 5. 自動起動の設定

Docker は自動起動するように設定済みです（`restart: unless-stopped`）。

VM 再起動時も自動的にコンテナが起動します。

## プロジェクト構造

```
toreka-tracker/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── scraper/              # スクレイピング機能
│   │   ├── fetcher.ts        # HTTP取得
│   │   ├── parser.ts         # HTMLパース
│   │   ├── detector.ts       # ページ番号検出
│   │   └── index.ts
│   ├── database/             # データベース
│   │   ├── db.ts             # SQLite初期化
│   │   └── repository.ts     # CRUD操作
│   ├── notifier/             # Discord通知
│   │   └── webhook.ts
│   ├── types/                # 型定義
│   │   └── index.ts
│   └── utils/                # ユーティリティ
│       ├── config.ts
│       └── logger.ts
├── data/                     # SQLite DB（自動生成）
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | **必須** |
| `TARGET_URL` | 監視対象のURL | `https://gamenv.net/tc/yodobashi/` |
| `SCRAPE_INTERVAL_MINUTES` | 監視間隔（分） | `1` |
| `DB_PATH` | SQLite DBパス | `./data/comments.db` |
| `LOG_LEVEL` | ログレベル | `info` |
| `NODE_ENV` | 環境 | `production` |

## 通知例

### 新規コメント

```
🆕 新規コメント

吉20分くらい前は小中学生のみでした！

👤 投稿者: 匿名
📄 ページ: 325
🕐 投稿時刻: 2025年10月20日 3:55 PM
```

### 返信コメント

```
💬 返信コメント

ありがとうございます！参考になりました。

👤 投稿者: 匿名
📄 ページ: 325
↩️ 返信先: コメントID: 207342
🕐 投稿時刻: 2025年10月20日 4:00 PM
```

## トラブルシューティング

### ログの確認

```bash
# Docker の場合
docker-compose logs -f

# ローカルの場合
npm run dev
```

### データベースのリセット

```bash
# データベースファイルを削除
rm -rf data/comments.db

# 再起動
docker-compose restart
```

### Discord 通知が届かない

1. Webhook URL が正しいか確認
2. Discord チャンネルの権限を確認
3. ログでエラーメッセージを確認

## 今後の機能拡張

- [ ] キーワードフィルタリング機能
- [ ] 古いコメントの自動削除
- [ ] ヘルスチェックエンドポイント
- [ ] 複数サイト対応
- [ ] Web UI での設定変更

## ライセンス

MIT

## 作者

Kim