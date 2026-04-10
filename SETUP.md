# Zairmag ERP - Шинэ PC суулгах заавар

## Урьдчилсан шаардлага

| # | Програм | Татах |
|---|---|---|
| 1 | **Node.js** (LTS 20+) | https://nodejs.org/ |
| 2 | **Git** | https://git-scm.com/download/win |
| 3 | **PostgreSQL** 16 | `winget install -e --id PostgreSQL.PostgreSQL.16` |
| 4 | **Python** 3.x | https://python.org/ (Add to PATH чагтлах!) |

## Алхам 1: GitHub-аас clone

```bat
cd C:\
git clone https://github.com/ez4puljin/erp-zairmag.git
cd erp-zairmag
```

## Алхам 2: PostgreSQL database үүсгэх

```bat
createdb -U postgres icecream_erp
```

## Алхам 3: .env файлуудыг үүсгэх

### backend\.env

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/icecream_erp?schema=public"
JWT_SECRET="random-64-char-string-here"
JWT_REFRESH_SECRET="another-random-64-char-string"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
PORT=3000
NODE_ENV="production"
```

> JWT secret үүсгэх: PowerShell дээр `[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()` (2 удаа)

### admin\.env.local

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### mobile\.env

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

> Tailscale-аар утас холбох бол `http://100.x.x.x:3000` гэж бичнэ

## Алхам 4: Backend суулгах + database migration

```bat
cd backend
npm install --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
cd ..
```

## Алхам 4.5: Анхны админ хэрэглэгч үүсгэх

```bat
cd backend
npx ts-node scripts/create-admin.ts
cd ..
```

Үүссэн нэвтрэх мэдээлэл:

| Талбар | Утга |
|---|---|
| Email | admin@icecream.mn |
| Нууц үг | password123 |
| Эрх | ADMIN |

> Нэвтэрсний дараа нууц үгээ заавал солино уу!

## Алхам 5: Admin web суулгах + build

```bat
cd admin
npm install --legacy-peer-deps
npm run build
cd ..
```

## Алхам 6: Mobile суулгах (Expo Go ашиглах бол)

```bat
cd mobile
npm install --legacy-peer-deps
cd ..
```

## Алхам 7: Firewall port нээх

Admin cmd-ээр:

```bat
netsh advfirewall firewall add rule name="ERP Backend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="ERP Admin" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
```

## Алхам 8: Ажиллуулах

### Cmd цонх #1 - Backend

```bat
cd C:\erp-zairmag\backend
npm run start
```

### Cmd цонх #2 - Admin web

```bat
cd C:\erp-zairmag\admin
npm run start -- -H 0.0.0.0 -p 3001
```

### Cmd цонх #3 - Mobile Expo Go (заавал биш)

```bat
cd C:\erp-zairmag\mobile
npx expo start --lan
```

## Шалгах

| Зүйл | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Admin web | http://localhost:3001 |
| Mobile Expo Go | QR код уншуулах |
| APK | zairmag-erp-v2.apk утсанд суулгах |

## Гар утас холбох

### APK (production)

zairmag-erp-v2.apk файлыг утсанд суулгана. "Server тохиргоо" хэсэгт:

```
http://<PC-ийн IP>:3000
```

### IP олох

```bat
ipconfig | findstr IPv4
ipconfig | findstr 100.
```

## Шинэчлэх (dev PC-аас push хийсний дараа)

```bat
cd C:\erp-zairmag
git pull
cd backend && npm install --legacy-peer-deps && npx prisma generate && npx prisma migrate deploy && cd ..
cd admin && npm install --legacy-peer-deps && npm run build && cd ..
```

Дараа нь backend + admin дахин эхлүүлэх.

## Backup

### Гараар backup хийх

```bat
pg_dump -U postgres -d icecream_erp -F c -f backup.dump
```

### Google Drive руу автомат backup

1. **Google Drive for Desktop** суулгах: https://www.google.com/drive/download/
2. `backup.bat` давхар дарж ажиллуулах — database + зургууд Google Drive руу хадгалагдана
3. Өдөр бүр автомат ажиллуулахын тулд (admin CMD):

```bat
schtasks /create /tn "Zairmag ERP Backup" /tr "C:\erp-zairmag\backup.bat" /sc daily /st 23:00
```

Backup хадгалагдах байршил: `G:\My Drive\zairmag-backup\`

- `db_YYYYMMDD_HHMM.dump` — database бүрэн backup
- `uploads\` — барааны зургууд
- 7 хоногоос хуучин backup автомат устгагдана

### Backup-аас сэргээх

```bat
pg_restore -U postgres -d icecream_erp --clean "G:\My Drive\zairmag-backup\db_20260410_2300.dump"
```

### Database устгаж шинээр үүсгэх

```bat
dropdb -U postgres icecream_erp
createdb -U postgres icecream_erp
cd backend
npx prisma migrate deploy
npx ts-node scripts/create-admin.ts
```
