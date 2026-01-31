# Anggota Silat API - Documentation

## Overview

API untuk mengelola profil anggota pencak silat yang terpisah dari tabel Users utama.

## Database Structure

### Users Table (Base)

Tabel untuk semua user (admin, user, anggota):

- `id`, `nama`, `email`, `password`, `role`
- `alamat`, `no_hp`, `foto`, `foto_url`

### AnggotaSilat Table (Extended)

Tabel khusus untuk anggota pencak silat:

- `id`, `userId` (FK to Users, unique)
- `nomor_anggota` (auto-generated, unique)
- `tempat_lahir`, `tanggal_lahir`, `jenis_kelamin`
- `status_perguruan`, `tingkatan_sabuk`
- `tanggal_bergabung`, `status_aktif`

### Relationship

- User `hasOne` AnggotaSilat
- AnggotaSilat `belongsTo` User

## API Endpoints

### POST /api/anggota

Create anggota profile

**Requirements:**

- User must exist with `role: 'anggota'`
- User cannot already have anggota profile

**Request Body:**

```json
{
  "userId": 1,
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "1990-01-15",
  "jenis_kelamin": "laki-laki",
  "status_perguruan": "Perguruan Setia Hati",
  "tingkatan_sabuk": "Hitam"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Anggota profile created successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "nomor_anggota": "SILAT-2026-0001",
    "tempat_lahir": "Jakarta",
    "tanggal_lahir": "1990-01-15",
    "jenis_kelamin": "laki-laki",
    "status_perguruan": "Perguruan Setia Hati",
    "tingkatan_sabuk": "Hitam",
    "tanggal_bergabung": "2026-02-01T00:00:00.000Z",
    "status_aktif": true,
    "user": {
      "id": 1,
      "nama": "John Doe",
      "email": "john@example.com",
      ...
    }
  }
}
```

**Notes:**

- `nomor_anggota` is auto-generated with format: `SILAT-YYYY-XXXX`
- `tanggal_bergabung` defaults to current date
- `status_aktif` defaults to `true`

### GET /api/anggota

Get all anggota with filtering and pagination

**Query Parameters:**

- `status_aktif` - Filter by active status (true/false)
- `tingkatan_sabuk` - Filter by belt level
- `search` - Search by user name
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### GET /api/anggota/stats

Get anggota statistics

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 100,
    "active": 95,
    "inactive": 5,
    "byBelt": [
      { "tingkatan_sabuk": "Putih", "count": 30 },
      { "tingkatan_sabuk": "Hitam", "count": 20 }
    ],
    "byGender": [
      { "jenis_kelamin": "laki-laki", "count": 60 },
      { "jenis_kelamin": "perempuan", "count": 40 }
    ]
  }
}
```

### GET /api/anggota/:id

Get anggota by ID with user information

### GET /api/anggota/user/:userId

Get anggota profile by user ID

### PUT /api/anggota/:id

Update anggota profile

**Request Body:**

```json
{
  "tingkatan_sabuk": "Sabuk Merah",
  "status_perguruan": "Perguruan Baru"
}
```

**Notes:**

- Cannot update `userId` or `nomor_anggota`

### DELETE /api/anggota/:id

Soft delete anggota (set `status_aktif` to false)

## Usage Flow

### 1. Create User with Role Anggota

```bash
POST /api/users (hypothetical endpoint)
{
  "nama": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "anggota",
  "alamat": "Jakarta",
  "no_hp": "081234567890"
}
```

### 2. Create Anggota Profile

```bash
POST /api/anggota
{
  "userId": 1,
  "tempat_lahir": "Jakarta",
  "tanggal_lahir": "1990-01-15",
  "jenis_kelamin": "laki-laki",
  "tingkatan_sabuk": "Putih"
}
```

### 3. Get Anggota with User Info

```bash
GET /api/anggota/1
# Returns anggota data with nested user object
```

### 4. Update Belt Level

```bash
PUT /api/anggota/1
{
  "tingkatan_sabuk": "Kuning"
}
```

## Integration with Event System

Anggota can register for events just like regular users:

```bash
# Anggota registers for event
POST /api/registrations
{
  "eventId": 1,
  "userId": 1,  # userId from anggota's user record
  "notes": "Saya anggota SILAT-2026-0001"
}
```

The event registration system will work seamlessly because:

- EventRegistration references `Users.id`
- AnggotaSilat also references `Users.id`
- Both share the same user record

## Benefits of Separated Structure

1. **Clean Data Model**
   - No NULL fields for non-anggota users
   - Clear separation of concerns

2. **Performance**
   - Lighter Users table for general queries
   - Only load anggota data when needed

3. **Scalability**
   - Easy to add more anggota-specific fields
   - Can create other specialized user types (Pelatih, Wasit, etc.)

4. **Flexibility**
   - Different validation rules for anggota
   - Separate business logic

## Validation Rules

### User Model

- `nama`: required, not empty
- `email`: required, valid email format, unique
- `password`: required, auto-hashed with bcrypt
- `role`: required, one of ['admin', 'user', 'anggota']

### AnggotaSilat Model

- `userId`: required, unique (one-to-one relationship)
- `nomor_anggota`: unique, auto-generated
- `jenis_kelamin`: must be 'laki-laki' or 'perempuan'
- `status_aktif`: required, defaults to true

## Auto-Generated Fields

### Nomor Anggota

Format: `SILAT-YYYY-XXXX`

- `SILAT`: Prefix
- `YYYY`: Current year
- `XXXX`: Sequential number (padded to 4 digits)

Example: `SILAT-2026-0001`, `SILAT-2026-0002`, etc.

The system automatically:

1. Checks the last member number for the current year
2. Increments by 1
3. Pads to 4 digits
4. Resets to 0001 each new year

## Error Handling

Common error responses:

**User not found:**

```json
{
  "success": false,
  "message": "User not found"
}
```

**User not anggota role:**

```json
{
  "success": false,
  "message": "User must have role 'anggota' to create anggota profile"
}
```

**Duplicate profile:**

```json
{
  "success": false,
  "message": "Anggota profile already exists for this user"
}
```

## Password Hashing

User passwords are automatically hashed using bcrypt:

- Hash on create (beforeCreate hook)
- Hash on update if password changed (beforeUpdate hook)
- Use `user.comparePassword(password)` to verify

Example:

```javascript
const user = await User.findOne({ where: { email } });
const isValid = await user.comparePassword(inputPassword);
```
