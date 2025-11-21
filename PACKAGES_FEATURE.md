# Paket Yönetimi Özelliği

## Genel Bakış

Zenith Studio'ya yeni bir **Paket Yönetimi** modülü eklendi. Bu özellik, spor salonu paketlerini merkezi bir yerden yönetmenizi ve bu paketleri üye onaylama sürecinde kullanmanızı sağlar.

## Özellikler

### 1. Paket Yönetimi Sayfası (`/packages`)

- **Paket Oluşturma**: Yeni üyelik paketleri oluşturun
- **Paket Düzenleme**: Mevcut paketleri güncelleyin
- **Paket Silme**: Artık kullanılmayan paketleri silin
- **Paket Durumu**: Paketleri aktif/pasif olarak işaretleyin
- **Arama ve Filtreleme**: Paketleri kolayca bulun

### 2. Paket Tipleri

Sistem 4 farklı paket tipi destekler:

- 🥉 **Temel (Basic)**: Standart üyelik paketi
- 🥈 **Premium**: Gelişmiş üyelik paketi
- 🥇 **Sınırsız (Unlimited)**: Sınırsız ders hakkı
- ⚡ **Özel (Custom)**: Özelleştirilmiş paketler

### 3. Paket Detayları

Her paket şu bilgileri içerir:

- **Ad**: Paket adı (örn: "Başlangıç Paketi")
- **Açıklama**: Paket hakkında kısa bilgi
- **Tip**: basic, premium, unlimited, custom
- **Ders Hakkı**: Paketteki ders sayısı (999 = Sınırsız)
- **Fiyat**: Paket ücreti (₺)
- **Süre**: Paket süresi (ay)
- **Özellikler**: Paketin içerdiği ekstra özellikler
- **Durum**: Aktif/Pasif

## Kullanım

### Paket Oluşturma

1. Sidebar'dan **"Paketler"** sekmesine gidin
2. **"Yeni Paket"** butonuna tıklayın
3. Paket bilgilerini doldurun:
   - Paket adı ve açıklama
   - Paket tipini seçin (Temel, Premium, Sınırsız, Özel)
   - Ders hakkı ve fiyat bilgilerini girin
   - Paket süresini belirleyin
   - Ek özellikler ekleyin (opsiyonel)
4. **"Oluştur"** butonuna tıklayın

### Paket Düzenleme

1. Düzenlemek istediğiniz paketin **"Düzenle"** butonuna tıklayın
2. Bilgileri güncelleyin
3. **"Güncelle"** butonuna tıklayın

### Paket Silme

1. Silmek istediğiniz paketin **"Sil"** butonuna tıklayın
2. Onay penceresinde **"Evet, Sil"** seçeneğini onaylayın

### Paket Durumu Değiştirme

- Her paketin üstündeki **toggle switch** ile paketi aktif/pasif yapabilirsiniz
- Pasif paketler üye onaylama sürecinde görünmez

## Üye Onaylama Entegrasyonu

### Otomatik Paket Yükleme

Üye Yönetimi sayfasında bir üyeyi onaylarken:

1. **Approval Modal** otomatik olarak aktif paketleri yükler
2. Kullanıcı listeden bir paket seçer
3. Paket bilgileri (fiyat, ders sayısı, süre) otomatik doldurulur
4. İsteğe bağlı olarak değerler manuel değiştirilebilir

### Fallback Mekanizma

Eğer sistemde hiç paket tanımlanmamışsa:

- Sistem varsayılan hardcoded paketleri kullanır (Temel, Premium, Sınırsız)
- Kullanıcıya bir uyarı mesajı gösterilir: "Henüz paket tanımlanmamış"
- Paket Yönetimi sayfasına yönlendirme linki sunulur

## Teknik Detaylar

### Yeni Dosyalar

```
src/
├── components/
│   └── Packages/
│       ├── Packages.jsx              # Ana paket yönetimi sayfası
│       ├── Packages.css              # Stil dosyası
│       ├── PackageModal.jsx          # Paket oluşturma/düzenleme modalı
│       ├── PackageModal.css          # Modal stil dosyası
│       ├── DeletePackageModal.jsx    # Paket silme onay modalı
│       └── DeletePackageModal.css    # Silme modalı stil dosyası
└── services/
    └── packageService.js             # Firebase Firestore paket servisi
```

### Güncellenmiş Dosyalar

- `src/App.jsx`: Packages route eklendi
- `src/components/Sidebar/Sidebar.jsx`: Paketler menü öğesi eklendi
- `src/components/Members/ApprovalModal.jsx`: Dinamik paket yükleme eklendi
- `src/components/Members/ApprovalModal.css`: Yeni stil sınıfları eklendi

### Firebase Collection

Paketler `packages` collection'ında saklanır:

```javascript
{
  id: "auto-generated",
  name: "Başlangıç Paketi",
  description: "Yeni başlayanlar için ideal paket",
  type: "basic",
  classes: 8,
  price: 500,
  duration: 1,
  features: ["Kişisel eğitmen desteği", "Beslenme programı"],
  isActive: true,
  createdAt: "2025-10-03T...",
  updatedAt: "2025-10-03T..."
}
```

### API Metodları

`packageService.js` şu metodları sağlar:

- `getAllPackages()`: Tüm paketleri getirir
- `getActivePackages()`: Sadece aktif paketleri getirir
- `getPackageById(id)`: Belirli bir paketi getirir
- `createPackage(data)`: Yeni paket oluşturur
- `updatePackage(id, data)`: Paketi günceller
- `deletePackage(id)`: Paketi siler
- `getPackagesByType(type)`: Belirli tipteki paketleri getirir

## Avantajlar

✅ **Merkezi Yönetim**: Tüm paketler tek bir yerden yönetilir
✅ **Esneklik**: İstediğiniz kadar paket oluşturabilirsiniz
✅ **Tutarlılık**: Aynı paket bilgileri her yerde kullanılır
✅ **Kolay Güncelleme**: Fiyat veya özellik değişikliği tek yerden yapılır
✅ **Otomatik Entegrasyon**: Paketler otomatik olarak üye onaylama sürecinde görünür
✅ **Fallback Desteği**: Paket yoksa varsayılan seçenekler kullanılır

## Gelecek Geliştirmeler

Potansiyel iyileştirmeler:

- [ ] Paket istatistikleri (kaç üye kullanıyor)
- [ ] Paket geçmişi ve versiyonlama
- [ ] Paket karşılaştırma tablosu
- [ ] Toplu paket işlemleri
- [ ] Paket şablonları
- [ ] Kampanya ve indirim yönetimi
- [ ] Paket yenileme otomasyonu

## Notlar

- Paketler silindikten sonra geri alınamaz
- Pasif paketler mevcut üyeleri etkilemez, sadece yeni onaylamalarda görünmez
- Her paket benzersiz bir ID alır
- Paket düzenlemeleri tüm yeni üyelikleri etkiler, mevcut üyelikleri değiştirmez

## Destek

Sorularınız için GitHub Issues bölümünü kullanabilirsiniz.
