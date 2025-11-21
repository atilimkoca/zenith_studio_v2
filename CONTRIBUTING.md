# Katkıda Bulunma Rehberi

Zenith projesine katkıda bulunmak istediğiniz için teşekkür ederiz! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 🚀 Başlarken

### Ön Gereksinimler

- Node.js (v16 veya üzeri)
- Git
- Kod editörü (VS Code önerilir)

### Projeyi Klonlama

```bash
git clone https://github.com/yourusername/zenith.git
cd zenith
npm install
```

## 📝 Katkı Süreci

### 1. Issue Oluşturma

- Yeni özellik önerileri veya hata raporları için GitHub Issues kullanın
- Mevcut issue'ları kontrol edin, duplicate oluşturmayın
- Net ve açıklayıcı başlıklar kullanın

### 2. Branch Oluşturma

```bash
git checkout -b feature/yeni-ozellik-adi
# veya
git checkout -b bugfix/hata-aciklamasi
```

### 3. Kod Yazma

- ESLint kurallarına uyun: `npm run lint`
- Responsive tasarım prensiplerini takip edin
- Türkçe değişken/fonksiyon isimleri kullanın (projenin dili Türkçe)

### 4. Commit Mesajları

Commit mesajlarınızı şu formatta yazın:

```
tip: kısa açıklama

Detaylı açıklama (isteğe bağlı)
```

**Commit Tipleri:**
- `feat`: Yeni özellik
- `fix`: Hata düzeltmesi
- `docs`: Dokümantasyon
- `style`: Kod formatı (logic değişikliği yok)
- `refactor`: Kod refaktöring
- `test`: Test ekleme/güncelleme

**Örnek:**
```bash
git commit -m "feat: üye arama özelliği eklendi"
```

### 5. Pull Request

1. Fork'unuzu güncel tutun
2. Branch'inizi push edin
3. Pull Request oluşturun
4. Açıklayıcı başlık ve detaylı açıklama ekleyin

## 🎨 Kod Standartları

### CSS/Styling

- CSS değişkenleri kullanın (`:root` içinde tanımlı)
- Mobile-first yaklaşım benimseyin
- BEM metodolojisini tercih edin

```css
/* İyi */
.member-card {
  /* ... */
}

.member-card__title {
  /* ... */
}

.member-card--active {
  /* ... */
}
```

### JavaScript/React

- Fonksiyonel bileşenler ve Hooks kullanın
- PropTypes veya TypeScript tip tanımları yapın
- Açıklayıcı değişken isimleri kullanın

```jsx
// İyi
const MemberCard = ({ member, onEdit, isActive }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEditClick = () => {
    setIsEditing(true);
    onEdit(member.id);
  };
  
  return (
    <div className={`member-card ${isActive ? 'member-card--active' : ''}`}>
      {/* ... */}
    </div>
  );
};
```

### Dosya Yapısı

```
src/
├── components/
│   └── ComponentName/
│       ├── ComponentName.jsx
│       ├── ComponentName.css
│       └── index.js
├── assets/
├── utils/
└── hooks/
```

## 🐛 Hata Raporlama

Hata raporu oluştururken şunları ekleyin:

- **Açıklama**: Hatanın kısa açıklaması
- **Adımlar**: Hatayı yeniden oluşturma adımları
- **Beklenen**: Beklediğiniz davranış
- **Gerçekleşen**: Gerçekleşen davranış
- **Ekran görüntüsü**: Varsa ekran görüntüsü
- **Ortam**: Tarayıcı, işletim sistemi bilgileri

## 🎯 Öncelikli Katkı Alanları

- [ ] Test yazma
- [ ] Accessibility iyileştirmeleri
- [ ] Performance optimizasyonları
- [ ] Dokümantasyon güncellemeleri
- [ ] Türkçe dil desteği iyileştirmeleri

## ❓ Sorular

Sorularınız için:

- GitHub Discussions kullanın
- Issue oluşturun
- Email gönderin: [your-email@example.com]

Katkılarınız çok değerli! 🙏
