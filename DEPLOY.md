# Үүлэн байршуулалт — Vercel (admin) + Render (backend)

Энэ заавар нь **admin вэбийг Vercel**, **backend API + PostgreSQL-ийг Render**
дээр байршуулах алхмуудыг тайлбарлана.

| Хэсэг | Хаана | Хаяг (жишээ) |
|---|---|---|
| Backend API | Render Web Service | `https://zairmag-erp-api.onrender.com` |
| Database | Render PostgreSQL | (Render дотооддоо холбоно) |
| Admin вэб | Vercel | `https://zairmag-erp.vercel.app` |
| Mobile | Expo / APK | `EXPO_PUBLIC_API_URL` → Render хаяг |

Дараалал чухал: **эхлээд backend**, дараа нь admin. Учир нь admin-д backend-ийн
хаяг хэрэгтэй, backend-д admin-ы домэйн CORS-д хэрэгтэй.

---

## Урьдчилсан бэлтгэл

Код GitHub дээр байх ёстой. Одоогийн салбараа push хийнэ:

```bash
git push -u origin feat/reports-excel-and-ui-foundation
```

Эсвэл `main` руу нэгтгэсний дараа байршуулж болно.

---

## 1. Backend — Render

### 1.1 Blueprint-аар үүсгэх (хялбар зам)

Репо дотор [`render.yaml`](render.yaml) бэлэн байгаа. Render dashboard дээр:

1. **New → Blueprint**
2. GitHub репог сонгох → салбараа сонгох
3. Render `render.yaml`-г уншиж дараах хоёрыг үүсгэнэ:
   - `zairmag-erp-api` — web service
   - `zairmag-erp-db` — PostgreSQL
4. **Apply** дарна

> Хэрэв `plan` эсвэл `region` нэрээс болж алдаа гарвал `render.yaml` доторх
> утгуудыг Render-ийн одоогийн жагсаалттай тааруулж засаад дахин оролдоно уу.
> Эдгээр нэрсийг Render үе үе өөрчилдөг.

### 1.2 Гараар үүсгэх (Blueprint ажиллахгүй бол)

**PostgreSQL:** New → PostgreSQL → нэр `zairmag-erp-db`, region `Singapore`.
Үүссэний дараа **Internal Database URL**-ыг хуулж авна.

**Web Service:** New → Web Service → репог сонгоод:

| Тохиргоо | Утга |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && node dist/src/main` |
| Health Check Path | `/health` |

> **`--include=dev` заавал.** Render `NODE_ENV=production` тавьдаг тул үүнгүйгээр
> npm нь devDependency-г алгасаж, `nest build` олдохгүй болж build унана.
>
> **Замыг анхаарна уу: `dist/src/main` (`dist/main` БИШ).** Төсөл нь `src`-ээс
> гадна `prisma.config.ts`, `scripts/` агуулдаг тул TypeScript гаралтын үүрийг
> нэг шат гүнзгийрүүлдэг.

**Disk** (Settings → Disks → Add Disk):

| Талбар | Утга |
|---|---|
| Name | `uploads` |
| Mount Path | `/var/data` |
| Size | 1 GB |

**Environment variables:**

| Түлхүүр | Утга |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (дээрх Internal Database URL) |
| `UPLOADS_DIR` | `/var/data/uploads` |
| `JWT_SECRET` | 64+ тэмдэгт санамсаргүй мөр |
| `JWT_REFRESH_SECRET` | өөр 64+ тэмдэгт мөр |
| `JWT_EXPIRATION` | `15m` |
| `JWT_REFRESH_EXPIRATION` | `7d` |
| `CORS_ORIGINS` | (одоохондоо хоосон — 3-р алхамд бөглөнө) |

> `PORT`-ыг бичих шаардлагагүй — Render өөрөө өгдөг.

### 1.3 Анхны админ хэрэглэгч

Render dashboard → service → **Shell** таб:

```bash
node dist/scripts/create-admin.js
```

Үүссэн эрх: `admin@icecream.mn` / `password123` — **нэвтэрсэн даруйдаа солино уу.**

### 1.4 Шалгах

```bash
curl https://zairmag-erp-api.onrender.com/health
```

`{"status":"ok","database":"ok",...}` ирвэл backend бэлэн.

---

## 2. Admin — Vercel

1. **Add New → Project** → GitHub репог сонгох
2. **Root Directory: `admin`** ← хамгийн чухал тохиргоо
3. Framework: Next.js (автоматаар танина)
4. Environment Variables:

| Түлхүүр | Утга |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://zairmag-erp-api.onrender.com` |

> Энэ хувьсагч дутуу бол admin өөрийн домэйны `:3000` порт руу хандахыг
> оролдоод браузер HTTPS→HTTP холимог агуулга гэж хаана. Заавал бөглөнө.

5. **Deploy**

Build/install командыг өөрчлөх шаардлагагүй — `admin/.npmrc` доторх
`legacy-peer-deps=true` тохиргоог Vercel уншина.

---

## 3. CORS холбох (мартаж болохгүй)

Vercel домэйн гарсны дараа Render → service → Environment:

```
CORS_ORIGINS = https://zairmag-erp.vercel.app,*.vercel.app
```

- Эхний утга нь production домэйн.
- `*.vercel.app` нь preview deploy бүрийн санамсаргүй дэд домэйныг зөвшөөрнө.
  Хэрэв preview хэрэггүй бол хасаж болно (илүү хатуу).

Хадгалсны дараа Render service автоматаар дахин эхэлнэ.

---

## 4. Mobile апп холбох

`mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://zairmag-erp-api.onrender.com
```

APK ашиглаж байгаа бол "Server тохиргоо" хэсэгт мөн энэ хаягийг бичнэ.

**Бонус:** HTTPS болсноор POS-ын **камерын зураасан код уншигч утсан дээр
ажиллана**. Локал сүлжээний `http://192.168.x.x` хаягаар браузер камерыг
хаадаг байсан.

---

## Анхаарах зүйлс

### Барааны зураг — байнгын диск заавал

Render-ийн контейнерын файл систем deploy бүрд шинэчлэгддэг. `UPLOADS_DIR`-ыг
байнгын диск рүү заагаагүй бол **оруулсан зураг deploy бүрд устана**.

Render-ийн үнэгүй багц дискийг дэмждэггүй. Сонголтууд:
1. Төлбөрт багц авч диск залгах (энэ зааврын бичсэн зам)
2. Зургийг S3 / Cloudinary / Vercel Blob руу бичдэг болгож кодыг өөрчлөх

### Үнэгүй багцын "унтах" зан

Free web service 15 минут хүсэлтгүй байвал унтдаг бөгөөд дараагийн хүсэлт
30-50 секунд хүлээдэг. Борлуулалтын үед хүлээлгэ үүсгэдэг тул төлбөрт багц
зөвлөмжтэй.

### Database backup

`backup.bat` (pg_dump → Google Drive) нь зөвхөн локал PostgreSQL дээр
ажиллана. Үүлэн дээр Render-ийн өөрийн backup дээр найдна:
Render → database → **Backups**. Багц бүр өөр хугацаагаар хадгалдаг тул
шалгаж баталгаажуулна уу.

Гараар татах бол Render-ийн **External Database URL**-ыг ашиглана:

```bash
pg_dump "postgresql://..." -F c -f backup.dump
```

### Migration

`npx prisma migrate deploy` нь start command дотор байгаа тул deploy бүрд
шинэ migration автоматаар хэрэгжинэ. Хэрэв олон instance ажиллуулах бол
үүнийг Render-ийн **Pre-Deploy Command** руу зөөнө (нэг л удаа ажиллана).

### Migration буцаах

Prisma migration-ыг автоматаар буцаадаггүй. Асуудал гарвал backup-аас
сэргээх нь хамгийн найдвартай — SETUP.md-ийн "Backup-аас сэргээх" хэсгийг үзнэ үү.

---

## Локал ажиллагаа өөрчлөгдөөгүй

Дээрх өөрчлөлтүүд локал дээр ямар нэг зүйл эвдээгүй:

- `UPLOADS_DIR` хоосон бол өмнөх шигээ `backend/uploads/` руу бичнэ
- `CORS_ORIGINS` хоосон байсан ч LAN болон Tailscale хаягууд зөвшөөрөгдсөн хэвээр
- `start.bat` / `stop.bat` хэвээр ажиллана
