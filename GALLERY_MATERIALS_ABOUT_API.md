# Gallery, Materials & About API - Documentation

## Overview

3 fitur baru untuk Event Management API:

1. **Gallery** - Dokumentasi foto
2. **Materials** - Materi pembelajaran untuk anggota
3. **About Us** - Informasi organisasi

---

## 1. GALLERY API (Dokumentasi Foto)

### GET /api/gallery

Get all photos

**Query Parameters:**

- `category` - event, training, competition, ceremony, other
- `eventId` - Filter by event
- `search` - Search by title
- `page`, `limit` - Pagination

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Latihan Rutin Sabtu",
      "category": "training",
      "photoUrl": "https://cloudinary.com/photo.jpg",
      "thumbnailUrl": "...",
      "takenAt": "2026-02-01",
      "uploader": { "nama": "Admin" },
      "event": { "title": "Latihan Rutin" }
    }
  ],
  "pagination": {...}
}
```

### POST /api/gallery

Upload photo (anggota, admin)

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "title": "Latihan Rutin Sabtu",
  "description": "Dokumentasi latihan",
  "category": "training",
  "photoUrl": "https://cloudinary.com/photo.jpg",
  "thumbnailUrl": "...",
  "eventId": 1,
  "takenAt": "2026-02-01"
}
```

### PUT /api/gallery/:id

Update photo (uploader or admin)

### DELETE /api/gallery/:id

Delete photo (uploader or admin)

---

## 2. MATERIALS API (Materi Pembelajaran)

### GET /api/materials

Get all materials (anggota only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

- `type` - video, document, pdf
- `category` - teknik_dasar, jurus, sejarah, teori, peraturan, lainnya
- `level` - beginner, intermediate, advanced, all
- `search` - Search by title
- `page`, `limit` - Pagination

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Teknik Dasar Pukulan",
      "type": "video",
      "category": "teknik_dasar",
      "level": "beginner",
      "fileUrl": "https://cloudinary.com/video.mp4",
      "thumbnailUrl": "...",
      "duration": 300,
      "viewCount": 150,
      "downloadCount": 50
    }
  ]
}
```

### POST /api/materials

Upload material (admin only)

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "title": "Teknik Dasar Pukulan",
  "description": "Video tutorial lengkap",
  "type": "video",
  "category": "teknik_dasar",
  "level": "beginner",
  "fileUrl": "https://cloudinary.com/video.mp4",
  "thumbnailUrl": "...",
  "duration": 300,
  "accessLevel": "anggota_only"
}
```

### POST /api/materials/:id/view

Increment view count (anggota)

### POST /api/materials/:id/download

Increment download count (anggota)

### PUT /api/materials/:id

Update material (admin only)

### DELETE /api/materials/:id

Delete material (admin only)

---

## 3. ABOUT US API

### GET /api/about

Get complete about info (public)

**Response:**

```json
{
  "success": true,
  "data": {
    "sejarah": "Organisasi ini didirikan...",
    "visi": "Menjadi organisasi terbaik...",
    "misi": "1. Mengembangkan...",
    "filosofiLogo": "Logo melambangkan...",
    "logoUrl": "https://cloudinary.com/logo.png",
    "founders": [
      {
        "id": 1,
        "nama": "Bapak Pendiri",
        "title": "Ketua Umum",
        "description": "Bio lengkap...",
        "photoUrl": "...",
        "order": 1
      }
    ]
  }
}
```

### PUT /api/about

Update about info (admin only)

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "sejarah": "Updated history...",
  "visi": "Updated vision...",
  "misi": "Updated mission...",
  "filosofiLogo": "Updated philosophy...",
  "logoUrl": "https://cloudinary.com/logo.png"
}
```

### GET /api/about/founders

Get founders (public)

### POST /api/about/founders

Add founder (admin only)

**Request:**

```json
{
  "nama": "Bapak Pendiri",
  "title": "Ketua Umum",
  "description": "Bio lengkap...",
  "photoUrl": "https://cloudinary.com/photo.jpg",
  "order": 1
}
```

### PUT /api/about/founders/:id

Update founder (admin only)

### DELETE /api/about/founders/:id

Delete founder (admin only)

---

## Access Control Summary

| Feature       | Public    | Anggota      | Admin     |
| ------------- | --------- | ------------ | --------- |
| **Gallery**   | View      | Upload, View | Full CRUD |
| **Materials** | No access | View, Track  | Full CRUD |
| **About**     | View      | View         | Full CRUD |

---

## Database Schema

### GalleryPhotos

- title, description, category (ENUM)
- photoUrl, thumbnailUrl
- uploadedBy (FK Users), eventId (FK Events)
- takenAt, isActive

### LearningMaterials

- title, description, type (ENUM), category (ENUM), level (ENUM)
- fileUrl, thumbnailUrl, fileSize, duration
- uploadedBy (FK Users), accessLevel (ENUM)
- viewCount, downloadCount, isActive

### AboutSections

- sejarah, visi, misi, filosofiLogo, logoUrl
- updatedBy (FK Users)

### Founders

- nama, title, description, photoUrl
- order, isActive

---

## Usage Examples

### Upload Photo

```bash
POST /api/gallery
Authorization: Bearer <token>

{
  "title": "Latihan Rutin",
  "category": "training",
  "photoUrl": "https://cloudinary.com/photo.jpg"
}
```

### Get Materials (Anggota)

```bash
GET /api/materials?category=teknik_dasar&level=beginner
Authorization: Bearer <token>
```

### Update About Info

```bash
PUT /api/about
Authorization: Bearer <token>

{
  "sejarah": "Organisasi ini didirikan pada tahun...",
  "visi": "Menjadi organisasi pencak silat terbaik..."
}
```

---

## Summary

✅ **Gallery**: Public photo documentation with event linking
✅ **Materials**: Member-only learning content with tracking
✅ **About**: Public organization info with founder profiles

**Total Endpoints**: 18 (Gallery: 5, Materials: 7, About: 6)
