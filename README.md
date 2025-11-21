# 🌿 Zenith - Spor & Yoga Stüdyosu

Modern ve kullanıcı dostu bir spor salonu ve yoga stüdyosu yönetim sistemi. React ve Vite ile geliştirilmiştir.

## ✨ Özellikler

- 🔐 **Kullanıcı Kimlik Doğrulama** - Güvenli giriş ve kayıt sistemi
- 📊 **Dashboard** - Genel bakış ve istatistikler
- 👥 **Üye Yönetimi** - Üye kayıtları ve takibi
- 🏋️ **Ekipman Yönetimi** - Spor aletleri ve bakım takibi
- 👨‍🏫 **Antrenör Yönetimi** - Antrenör programları ve takibi
- 📅 **Program Yönetimi** - Ders programları ve rezervasyonlar
- 💰 **Mali İşler** - Ödeme takibi ve finansal raporlar
- 📈 **Raporlama** - Detaylı analiz ve raporlar
- ⚙️ **Ayarlar** - Sistem konfigürasyonu
- 📱 **Responsive Tasarım** - Mobil ve tablet uyumlu

## 🚀 Kurulum

### Ön Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn

### Projeyi Klonlama

```bash
git clone https://github.com/yourusername/zenith.git
cd zenith
```

### Bağımlılıkları Yükleme

```bash
npm install
# veya
yarn install
```

### Geliştirme Sunucusunu Başlatma

```bash
npm run dev
# veya
yarn dev
```

Tarayıcınızda `http://localhost:5173` adresine giderek uygulamayı görüntüleyebilirsiniz.

## 🛠️ Mevcut Scripts

```bash
npm run dev      # Geliştirme sunucusunu başlatır
npm run build    # Üretime hazır build oluşturur
npm run lint     # ESLint ile kod kontrolü yapar
npm run preview  # Build edilen uygulamayı önizler
```

## 📁 Proje Yapısı

```
zenith/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   │   ├── react.svg
│   │   ├── zenith_logo.jpg
│   │   └── zenith_logo_rounded.jpg
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Auth.css
│   │   │   ├── AuthContainer.jsx
│   │   │   ├── AuthDemo.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── Dashboard/
│   │   ├── Equipment/
│   │   ├── Finance/
│   │   ├── Members/
│   │   ├── Reports/
│   │   ├── Schedule/
│   │   ├── Settings/
│   │   ├── Sidebar/
│   │   └── Trainers/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── eslint.config.js
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

## 🎨 Tasarım Sistemi

Proje, modern ve temiz bir tasarım dili kullanır:

- **Ana Renkler**: Sage Green (#5A6B5B), Beige (#F5F1E8)
- **Tipografi**: Clean, modern font ailesi
- **Bileşenler**: Yeniden kullanılabilir React bileşenleri
- **Responsive**: Mobil-first yaklaşım

## 🔧 Teknolojiler

- **Frontend**: React 19.1.1
- **Build Tool**: Vite 7.1.2
- **Linting**: ESLint
- **CSS**: Vanilla CSS (CSS Variables)
- **Icons**: SVG Icons

## 📱 Responsive Tasarım

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

## 🚀 Deployment

### Vercel ile Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/zenith)

### Netlify ile Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/zenith)

### Manuel Build

```bash
npm run build
```

`dist` klasöründeki dosyalar herhangi bir statik hosting servisine yüklenebilir.

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch'i oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik: açıklama'`)
4. Branch'inizi push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.

## 📞 İletişim

Proje hakkında sorularınız için:

- Email: [your-email@example.com]
- Website: [https://zenith-studio.com]

---

**Zenith Spor & Yoga Stüdyosu** - Modern fitness yönetimi için geliştirildi 🌿
