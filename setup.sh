#!/bin/bash

echo "🚀 VPN Access Manager - Setup Script"
echo "===================================="
echo ""

# Check if running in correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
  echo "❌ Please run this script from the vpn-access root directory"
  exit 1
fi

# Setup Backend
echo "📦 Setting up Backend..."
cd backend
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ Created backend/.env - Please edit with your configuration"
else
  echo "✅ backend/.env already exists"
fi

if command -v npm &> /dev/null; then
  echo "⬇️  Installing backend dependencies..."
  npm install
else
  echo "⚠️  npm not found. Please install dependencies manually: cd backend && npm install"
fi
cd ..

# Setup Frontend
echo ""
echo "📦 Setting up Frontend..."
cd frontend
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ Created frontend/.env - Please edit with your configuration"
else
  echo "✅ frontend/.env already exists"
fi

if command -v npm &> /dev/null; then
  echo "⬇️  Installing frontend dependencies..."
  npm install
else
  echo "⚠️  npm not found. Please install dependencies manually: cd frontend && npm install"
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit backend/.env with your Firebase Admin and WireGuard config"
echo "   2. Edit frontend/.env with your Firebase client config"
echo "   3. Make sure WireGuard is installed and configured"
echo "   4. Run: cd backend && npm run dev"
echo "   5. Run: cd frontend && npm run dev"
echo ""
