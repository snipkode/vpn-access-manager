# Firestore Collections Analysis & Security Rules

## Daftar Collection yang Digunakan

Berdasarkan analisis kode backend, berikut adalah semua collection Firestore yang digunakan:

### 1. **users** 
Dokumen profil pengguna
- Fields: `firebase_uid`, `email`, `display_name`, `role`, `phone`, `whatsapp`, `avatar_url`, `vpn_enabled`, `subscription_plan`, `subscription_end`, `wallet_balance`, `referral_code`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: Owner (saat signup)
- Update: Owner (field terbatas) atau Admin
- Delete: Admin only

### 2. **devices**
Dokumen device VPN per user
- Fields: `user_id`, `device_name`, `public_key`, `private_key`, `ip_address`, `status`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: Owner (user_id harus sesuai)
- Update: Owner atau Admin
- Delete: Owner atau Admin

### 3. **payments**
Dokumen pembayaran user
- Fields: `user_id`, `amount`, `status`, `payment_method`, `bank_name`, `account_number`, `proof_image`, `admin_note`, `approved_by`, `approved_at`, `rejected_at`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: Owner (status harus 'pending', amount > 0)
- Update: Admin only (status, admin_note, dll)
- Delete: Admin only

### 4. **credit_transactions**
Transaksi kredit/transfer antar user
- Fields: `from_user_id`, `to_user_id`, `user_id`, `amount`, `type`, `description`, `status`, `admin_note`, `reviewed_by`, `reviewed_at`, `blocked_reason`, `completed_at`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Sender, Receiver, atau Admin
- Create: Sender atau Admin
- Update: Admin only (review, status)
- Delete: Admin only

### 5. **user_credits**
Saldo kredit user
- Fields: `user_id`, `balance`, `total_earned`, `total_spent`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: Admin/System only
- Update: Admin/System only (balance, total_earned, total_spent)
- Delete: Admin only

### 6. **referrals**
Kode referral per user
- Fields: `user_id`, `referral_code`, `tier`, `total_referrals`, `total_earnings`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: System (via Cloud Functions)
- Update: Admin only
- Delete: Admin only

### 7. **referral_events**
Event referral (signup & qualifying)
- Fields: `referrer_id`, `referee_id`, `event_type`, `status`, `bonus_amount`, `qualified_at`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Referrer atau Admin
- Create: System (via Cloud Functions)
- Update: Admin only
- Delete: Admin only

### 8. **referral_bonuses**
Bonus referral yang diberikan
- Fields: `user_id`, `event_id`, `amount`, `type`, `created_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: System (amount > 0)
- Update: Admin only
- Delete: Admin only

### 9. **fraud_alerts**
Alert fraud dari sistem
- Fields: `user_id`, `transaction_id`, `alert_type`, `risk_score`, `status`, `admin_note`, `reviewed_by`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via Cloud Functions)
- Update: Admin only
- Delete: Admin only

### 10. **fraud_config**
Konfigurasi sistem fraud
- Fields: `enabled`, `threshold`, `auto_block`, `notification_enabled`

**Aturan Keamanan:**
- Read: Admin only
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 11. **topups**
Top up kredit oleh admin
- Fields: `user_id`, `amount`, `status`, `admin_note`, `created_by`, `created_at`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: Admin only (amount > 0)
- Update: Admin only (status, admin_note)
- Delete: Admin only

### 12. **user_preferences**
Preferensi user (theme, notification, dll)
- Fields: `user_id`, `theme`, `language`, `notifications_enabled`, `updated_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: Owner
- Update: Owner
- Delete: Admin only

### 13. **payment_settings**
Pengaturan pembayaran (billing config)
- Fields: `min_payment`, `max_payment`, `active`, `currency`, `banks`, `subscription_plans`

**Aturan Keamanan:**
- Read: Anyone (untuk billing display)
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 14. **bank_accounts**
Rekening bank untuk pembayaran
- Fields: `bank_name`, `account_number`, `account_holder`, `is_active`, `created_at`

**Aturan Keamanan:**
- Read: Anyone (active accounts)
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 15. **subscription_plans**
Paket subscription VPN
- Fields: `name`, `price`, `duration_days`, `device_limit`, `is_active`, `created_at`

**Aturan Keamanan:**
- Read: Anyone (untuk billing display)
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 16. **settings**
Pengaturan sistem (legacy)
- Fields: bervariasi per kategori (billing, whatsapp, email, notifications, general)

**Aturan Keamanan:**
- Read: Admin only
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 17. **audit_logs**
Log audit aktivitas sistem
- Fields: `action`, `user_id`, `resource_type`, `resource_id`, `details`, `ip_address`, `created_at`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via middleware)
- Update: No one (immutable)
- Delete: No one (immutable)

### 18. **audit_logs_compact**
Log audit format compact
- Fields: `ts`, `uid`, `act`, `res`, `rid`, `det`, `ip`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via middleware)
- Update: No one (immutable)
- Delete: No one (immutable)

### 19. **notifications**
Notifikasi untuk user
- Fields: `user_id`, `title`, `message`, `type`, `read`, `read_at`, `created_at`

**Aturan Keamanan:**
- Read: Owner atau Admin
- Create: System
- Update: Owner (mark as read only)
- Delete: Admin only

### 20. **backup_logs**
Log backup sistem
- Fields: `status`, `backup_type`, `file_path`, `size`, `duration`, `error`, `created_at`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via backup service)
- Update: No one (immutable)
- Delete: Admin only

### 21. **restore_logs**
Log restore sistem
- Fields: `status`, `backup_id`, `file_path`, `error`, `created_at`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via restore service)
- Update: No one (immutable)
- Delete: Admin only

### 22. **backup_settings**
Pengaturan backup
- Fields: `enabled`, `schedule`, `retention_days`, `storage_type`, `encryption_enabled`

**Aturan Keamanan:**
- Read: Admin only
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 23. **backup_alerts**
Alert backup
- Fields: `type`, `message`, `status`, `created_at`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via backup monitor)
- Update: Admin only
- Delete: Admin only

### 24. **backups**
Metadata backup
- Fields: `backup_type`, `file_path`, `size`, `status`, `created_at`

**Aturan Keamanan:**
- Read: Admin only
- Create: System (via Cloud Functions)
- Update: Admin only
- Delete: Admin only

### 25. **referral_config**
Konfigurasi referral system
- Fields: `enabled`, `tiers`, `bonus_amounts`, `qualification_days`

**Aturan Keamanan:**
- Read: Admin only
- Create: Admin only
- Update: Admin only
- Delete: Admin only

---

## Ringkasan Aturan Keamanan

### Prinsip Dasar

1. **Least Privilege** - User hanya bisa akses data mereka sendiri
2. **Admin Override** - Admin dapat akses semua data untuk operasional
3. **Validation** - Validasi tipe data dan field yang diupdate
4. **Immutable Logs** - Audit logs tidak dapat diubah atau dihapus
5. **System Collections** - Collection sistem hanya untuk admin/system

### Helper Functions

```javascript
// Check if user is admin
function isAdmin()

// Check if user owns the resource
function isOwner(userId)

// Validate email format
function isValidEmail(email)

// Validate phone number format
function isValidPhone(phone)

// Validate timestamp format
function isValidTimestamp(value)

// Validate number is positive
function isPositiveNumber(value)
```

### Collection Groups

| Group | Collections | Access |
|-------|-------------|--------|
| **User Data** | users, devices, user_preferences | Owner + Admin |
| **Financial** | payments, credit_transactions, user_credits, topups | Owner + Admin (strict validation) |
| **Referral** | referrals, referral_events, referral_bonuses, referral_config | Owner + Admin |
| **System** | fraud_alerts, fraud_config, audit_logs, backup_* | Admin only |
| **Settings** | payment_settings, bank_accounts, subscription_plans, settings | Public read (some), Admin write |
| **Notifications** | notifications | Owner + Admin |

---

## Cara Deploy Rules

```bash
# Deploy firestore rules
firebase deploy --only firestore:rules

# Validate rules syntax
firebase deploy --only firestore:rules --dry-run
```

## Testing Rules

Gunakan Firebase Emulator untuk testing:

```bash
# Start emulator
firebase emulators:start

# Run tests
npm test
```

## Catatan Penting

1. **Indexes**: Beberapa query memerlukan composite indexes. Lihat `FIRESTORE_INDEX_SETUP.md`
2. **Rate Limiting**: Backend sudah memiliki rate limiting untuk endpoint kritis
3. **Audit Trail**: Semua aksi penting dicatat di audit_logs
4. **Backup**: Data dibackup secara berkala ke Google Cloud Storage
