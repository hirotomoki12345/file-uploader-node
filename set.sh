#!/bin/bash

REPO_URL="https://github.com/hirotomoki12345/file-uploader-node.git"
DIR_NAME="file-uploader-node"

function install_dependencies() {
    # git
    if ! command -v git &> /dev/null; then
        echo "gitがインストールされていません。インストール中..."
        sudo apt-get update
        sudo apt-get install -y git
    else
        echo "gitはすでにインストールされています。"
    fi

    if ! command -v node &> /dev/null; then
        echo "Node.jsがインストールされていません。インストール中..."
        curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "Node.jsはすでにインストールされています。"
    fi

    if ! command -v pm2 &> /dev/null; then
        echo "PM2がインストールされていません。インストール中..."
        npm install -g pm2
    else
        echo "PM2はすでにインストールされています。"
    fi
}

function start_server() {
    cd "$DIR_NAME" || exit
    npm install
    pm2 start server.js --name "file-uploader"
    echo "サーバーがPM2で起動しました。"
}

function remove_server() {
    pm2 stop "file-uploader" && pm2 delete "file-uploader"
    cd ..
    rm -rf "$DIR_NAME"
    echo "サーバーとディレクトリが削除されました。"
}

install_dependencies

echo "1: サーバーを起動"
echo "2: サーバーを削除"

read -p "オプションを選択してください (1/2): " option

if [[ $option -eq 1 ]]; then
    if [ ! -d "$DIR_NAME" ]; then
        git clone "$REPO_URL"
        start_server
    else
        echo "ディレクトリ '$DIR_NAME' はすでに存在します。"
        start_server
    fi
elif [[ $option -eq 2 ]]; then
    remove_server
else
    echo "無効なオプションです。"
    exit 1
fi
