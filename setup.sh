#!/bin/bash

echo "🚀 VPN Access Manager - Setup Script"
echo "===================================="
echo ""

# Check if running in correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "client" ] || [ ! -d "mobile" ] || [ ! -d "vpn-client" ]; then
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

# Setup Client
echo ""
echo "📦 Setting up Desktop Client..."
cd client
if [ ! -f ".env" ]; then
  echo "✅ No .env needed for client"
fi

if command -v npm &> /dev/null; then
  echo "⬇️  Installing client dependencies..."
  npm install
else
  echo "⚠️  npm not found. Please install dependencies manually: cd client && npm install"
fi
cd ..

# Setup Mobile
echo ""
echo "📦 Setting up Mobile App..."
cd mobile
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ Created mobile/.env - Please edit with your configuration"
else
  echo "✅ mobile/.env already exists"
fi

if command -v npm &> /dev/null; then
  echo "⬇️  Installing mobile dependencies..."
  npm install
else
  echo "⚠️  npm not found. Please install dependencies manually: cd mobile && npm install"
fi
cd ..

# Setup VPN Client
echo ""
echo "📦 Setting up VPN Client..."
cd vpn-client
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ Created vpn-client/.env - Please edit with your configuration"
else
  echo "✅ vpn-client/.env already exists"
fi

if command -v npm &> /dev/null; then
  echo "⬇️  Installing vpn-client dependencies..."
  npm install
else
  echo "⚠️  npm not found. Please install dependencies manually: cd vpn-client && npm install"
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit backend/.env with your Firebase Admin and WireGuard config"
echo "   2. Edit frontend/.env with your Firebase client config"
echo "   3. Edit mobile/.env with your Firebase and Google OAuth config"
echo "   4. Edit vpn-client/.env with your Firebase config"
echo "   5. Add icon files to all assets/ folders"
echo "   6. Make sure WireGuard is installed and configured"
echo "   7. Run: cd backend && npm run dev"
echo "   8. Run: cd frontend && npm run dev"
echo "   9. Run: cd client && npm start (Desktop Client)"
echo "   10. Run: cd mobile && npm start (Mobile App with Login)"
echo "   11. Run: cd vpn-client && npm start (VPN Client App)"
echo ""
