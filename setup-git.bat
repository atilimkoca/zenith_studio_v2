@echo off
echo.
echo ==========================================
echo   Zenith - GitHub Repository Setup
echo ==========================================
echo.

echo [1/6] Initializing Git repository...
git init

echo.
echo [2/6] Adding all files to staging...
git add .

echo.
echo [3/6] Creating initial commit...
git commit -m "feat: initial commit - Zenith spor ve yoga stüdyosu yönetim sistemi

- Modern ve responsive UI tasarımı
- Kullanıcı kimlik doğrulama sistemi (Login/Register)
- Dashboard ve navigasyon sistemi
- Üye, antrenör, ekipman yönetim modülleri
- Mali işler ve raporlama sistemi
- Zenith logosu entegrasyonu
- Mobile-first responsive tasarım
- React 19.1.1 ve Vite ile geliştirildi"

echo.
echo [4/6] Setting default branch to main...
git branch -M main

echo.
echo [5/6] Next steps:
echo   1. Create a new repository on GitHub
echo   2. Copy the repository URL
echo   3. Run: git remote add origin YOUR_REPOSITORY_URL
echo   4. Run: git push -u origin main
echo.

echo [6/6] Useful commands:
echo   git status           - Check repository status
echo   git log --oneline    - View commit history
echo   npm run dev          - Start development server
echo   npm run build        - Build for production
echo   npm run lint         - Run ESLint
echo.

echo ==========================================
echo   Setup completed successfully! 🎉
echo ==========================================
echo.

pause
