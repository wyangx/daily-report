#!/bin/bash

# 每日新闻日报系统启动脚本

echo "================================="
echo "  每日新闻日报系统"
echo "================================="
echo ""

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
  echo "错误: 未找到 .env 文件"
  echo "请先复制 .env.example 为 .env 并配置"
  exit 1
fi

# 检查 node_modules 是否存在
if [ ! -d node_modules ]; then
  echo "正在安装依赖..."
  npm install
fi

# 启动系统
echo "正在启动系统..."
node src/index.js
