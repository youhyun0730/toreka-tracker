# Oracle Cloud Infrastructure (OCI) デプロイ手順

## 前提条件

- OCIアカウント
- Oracle Cloud Compute インスタンス（Ubuntu/Oracle Linux推奨）
- SSH接続設定済み

## 1. サーバーへの接続

```bash
ssh opc@<your-instance-ip>
```

## 2. Docker & Docker Composeのインストール

### Docker のインストール

```bash
# システムアップデート
sudo yum update -y  # Oracle Linux
# または
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Docker インストール (Oracle Linux)
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker

# Docker インストール (Ubuntu)
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# 一度ログアウトして再ログイン
exit
```

再ログイン後、Dockerが動作することを確認：

```bash
docker --version
docker compose version
```

## 3. プロジェクトのデプロイ

### リポジトリのクローン

```bash
# Gitがインストールされていない場合
sudo yum install -y git  # Oracle Linux
# または
sudo apt install -y git  # Ubuntu

# プロジェクトをクローン
git clone <your-repository-url> toreka-tracker
cd toreka-tracker
```

### 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env  # .env.exampleがある場合
# または
nano .env
```

.envファイルの内容：

```env
# Discord Webhook URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Target website to monitor
TARGET_URL=https://gamenv.net/tc/yodobashi/

# Scraping interval in minutes
SCRAPE_INTERVAL_MINUTES=1

# Database path
DB_PATH=/app/data/comments.db

# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Environment
NODE_ENV=production
```

### データディレクトリの作成

```bash
mkdir -p data
```

## 4. Dockerイメージのビルドと起動

```bash
# イメージのビルド
docker compose build

# コンテナの起動
docker compose up -d

# ログの確認
docker compose logs -f

# Ctrl+C でログ表示を終了（コンテナは動き続けます）
```

## 5. 動作確認

```bash
# コンテナの状態確認
docker compose ps

# ログの確認
docker compose logs -f toreka-tracker

# データベースの確認
ls -la data/
```

## 6. ファイアウォール設定（必要な場合）

アプリ自体はポートを開放しませんが、OCIのセキュリティリストで**アウトバウンド通信を許可**してください：

- Discord Webhook (HTTPS/443)
- スクレイピング対象サイト (HTTPS/443)

## 管理コマンド

### コンテナの停止

```bash
docker compose down
```

### コンテナの再起動

```bash
docker compose restart
```

### ログの確認

```bash
# リアルタイムログ
docker compose logs -f

# 最新100行
docker compose logs --tail=100
```

### コンテナ内に入る（デバッグ用）

```bash
docker compose exec toreka-tracker sh
```

### データベースのバックアップ

```bash
# ローカルにコピー
docker compose cp toreka-tracker:/app/data/comments.db ./backup-$(date +%Y%m%d).db

# または直接dataディレクトリをバックアップ
cp -r data data-backup-$(date +%Y%m%d)
```

## 更新手順

新しいバージョンをデプロイする場合：

```bash
# 最新コードを取得
git pull

# コンテナを停止
docker compose down

# イメージを再ビルド
docker compose build

# コンテナを起動
docker compose up -d

# ログを確認
docker compose logs -f
```

## トラブルシューティング

### Puppeteerが起動しない

```bash
# コンテナのログを確認
docker compose logs toreka-tracker

# Chromiumの依存関係が不足している場合、Dockerfileを確認
```

### メモリ不足エラー

OCIの無料枠（1GB RAM）では厳しい可能性があります。以下を試してください：

1. `SCRAPE_INTERVAL_MINUTES` を増やす（例: 5分）
2. より大きいインスタンスタイプを使用

### ディスク容量不足

```bash
# Dockerの未使用イメージ・コンテナを削除
docker system prune -a

# データベースのサイズ確認
du -sh data/comments.db
```

## 自動起動設定

システム起動時にDockerコンテナを自動起動：

```bash
# Docker サービスの自動起動を有効化（既に設定済み）
sudo systemctl enable docker

# docker-compose.ymlに restart: unless-stopped が設定されているため、
# Dockerが起動すれば自動的にコンテナも起動します
```

## セキュリティ推奨事項

1. **定期的なアップデート**
   ```bash
   sudo yum update -y  # Oracle Linux
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   ```

2. **SSHポートの変更**（オプション）

3. **ファイアウォールの適切な設定**

4. **.envファイルのパーミッション**
   ```bash
   chmod 600 .env
   ```

## モニタリング

Discordに通知が来ることを確認してください。来ない場合：

1. DISCORD_WEBHOOK_URLが正しいか確認
2. ログで詳細なエラーを確認: `docker compose logs -f`
3. LOG_LEVELをdebugに設定して詳細ログを確認

---

## 簡易セットアップスクリプト

全ての手順を自動化したい場合、以下のスクリプトを使用：

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Toreka Tracker デプロイ開始..."

# Docker & Docker Composeのインストール確認
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません"
    exit 1
fi

# データディレクトリ作成
mkdir -p data

# .envファイルの確認
if [ ! -f .env ]; then
    echo "❌ .envファイルが見つかりません"
    exit 1
fi

# ビルドと起動
echo "📦 Dockerイメージをビルド中..."
docker compose build

echo "🏃 コンテナを起動中..."
docker compose up -d

echo "✅ デプロイ完了！"
echo ""
echo "📊 ログを確認:"
echo "  docker compose logs -f"
echo ""
echo "🛑 停止:"
echo "  docker compose down"
```

使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```
