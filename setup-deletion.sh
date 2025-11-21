#!/bin/bash

echo "🚀 Setting up Zenith Studio Complete User Deletion"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Navigate to server directory
echo "📁 Setting up server..."
cd server

# Install dependencies
echo "📦 Installing server dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating environment configuration..."
    cp .env.example .env
    echo "📝 Please edit server/.env with your Firebase credentials"
    echo "   1. Go to Firebase Console → Project Settings → Service Accounts"
    echo "   2. Generate new private key"
    echo "   3. Copy the credentials to server/.env"
else
    echo "✅ Environment file already exists"
fi

echo ""
echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your Firebase credentials"
echo "2. Run: cd server && npm start"
echo "3. Server will be available at http://localhost:3001"
echo ""
echo "📖 See COMPLETE_DELETION_SETUP.md for detailed instructions"
