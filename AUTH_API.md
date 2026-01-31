# Authentication API - Documentation

## Overview

Sistem autentikasi lengkap dengan JWT (JSON Web Token), role-based access control, dan CORS configuration untuk Event Management API.

## Features

✅ **JWT-based Authentication**

- Secure token generation
- Token expiration (7 days default)
- Token verification middleware

✅ **Role-Based Access Control**

- 3 roles: `admin`, `user`, `anggota`
- Role-specific permissions
- Ownership verification

✅ **Security Features**

- Password hashing with bcrypt
- Rate limiting for login (5 attempts per 15 minutes)
- CORS with origin whitelist
- Secure error messages

✅ **CORS Configuration**

- Whitelist allowed origins
- Credentials support
- Proper headers configuration

---

## Authentication Endpoints

### POST /api/auth/register

Register new user

**Request Body:**

```json
{
  "nama": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user",
  "alamat": "Jakarta",
  "no_hp": "081234567890"
}
```

**Validation:**

- `nama`, `email`, `password` are required
- Email must be valid format
- Password minimum 6 characters
- Email must be unique
- Role must be one of: `admin`, `user`, `anggota` (default: `user`)

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "nama": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "alamat": "Jakarta",
    "no_hp": "081234567890",
    "createdAt": "2026-02-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Validation error (missing fields, invalid email, weak password)
- `400` - Email already registered
- `500` - Server error

---

### POST /api/auth/login

Login user and get JWT token

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nama": "John Doe",
      "email": "john@example.com",
      "role": "anggota",
      "alamat": "Jakarta",
      "no_hp": "081234567890",
      "foto": null,
      "foto_url": null,
      "anggotaSilat": {
        "id": 1,
        "nomor_anggota": "SILAT-2026-0001",
        "tingkatan_sabuk": "Putih",
        "status_aktif": true
      }
    }
  }
}
```

**Notes:**

- `anggotaSilat` only included if user has role `anggota` and profile exists
- Token expires in 7 days (configurable via `JWT_EXPIRES_IN`)

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid credentials
- `429` - Too many login attempts (rate limited)
- `500` - Server error

**Rate Limiting:**

- Maximum 5 failed attempts per email
- Lockout period: 15 minutes
- Counter resets after successful login or timeout

---

### GET /api/auth/profile

Get authenticated user profile

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nama": "John Doe",
    "email": "john@example.com",
    "role": "anggota",
    "alamat": "Jakarta",
    "no_hp": "081234567890",
    "foto": null,
    "foto_url": null,
    "anggotaSilat": {
      "id": 1,
      "nomor_anggota": "SILAT-2026-0001",
      "tempat_lahir": "Jakarta",
      "tanggal_lahir": "1990-01-15",
      "jenis_kelamin": "laki-laki",
      "status_perguruan": "Perguruan Setia Hati",
      "tingkatan_sabuk": "Putih",
      "tanggal_bergabung": "2026-01-01",
      "status_aktif": true
    }
  }
}
```

**Error Responses:**

- `401` - No token provided
- `401` - Invalid token
- `401` - Token expired
- `404` - User not found
- `500` - Server error

---

### PUT /api/auth/profile

Update user profile

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "nama": "John Updated",
  "alamat": "Jakarta Selatan",
  "no_hp": "081234567891",
  "foto": "profile.jpg",
  "foto_url": "https://cloudinary.com/..."
}
```

**Notes:**

- All fields are optional
- Cannot update `email`, `password`, or `role` via this endpoint
- Use `/api/auth/change-password` to change password

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    ...updated user data
  }
}
```

---

### PUT /api/auth/change-password

Change user password

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

**Validation:**

- Both fields required
- New password minimum 6 characters
- Current password must be correct

**Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `400` - Missing fields or weak password
- `401` - Current password incorrect
- `500` - Server error

---

### GET /api/auth/verify

Verify if token is still valid

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": 1,
    "email": "john@example.com",
    "role": "anggota"
  }
}
```

**Use Case:**

- Frontend can check if token is still valid before making requests
- Useful for session management

---

## Middleware

### authenticate

Verify JWT token and attach user to request

**Usage:**

```javascript
router.get("/protected", authenticate, controller.method);
```

**Behavior:**

- Extracts token from `Authorization: Bearer <token>` header
- Verifies token signature and expiration
- Checks if user still exists in database
- Attaches `req.user` with `{ userId, email, role }`
- Returns 401 if token invalid/expired/missing

---

### authorize(...roles)

Check if authenticated user has required role

**Usage:**

```javascript
// Only admin and anggota can create events
router.post(
  "/events",
  authenticate,
  authorize("admin", "anggota"),
  createEvent,
);

// Only admin can delete
router.delete("/anggota/:id", authenticate, authorize("admin"), deleteAnggota);
```

**Behavior:**

- Must be used after `authenticate` middleware
- Checks if `req.user.role` matches one of allowed roles
- Returns 403 if role not authorized

---

### optionalAuth

Optional authentication - don't fail if no token

**Usage:**

```javascript
// Public endpoint, but enhanced if authenticated
router.get("/events", optionalAuth, getAllEvents);
```

**Behavior:**

- Tries to extract and verify token
- If valid, attaches `req.user`
- If invalid/missing, continues without `req.user`
- Never returns error
- Controller can check `if (req.user)` for authenticated users

---

### checkOwnership(Model, ownerField)

Verify user owns the resource

**Usage:**

```javascript
router.put(
  "/events/:id",
  authenticate,
  checkOwnership(Event, "organizerId"),
  updateEvent,
);
```

**Behavior:**

- Admin can access any resource
- Non-admin must own the resource
- Checks `resource[ownerField] === req.user.userId`
- Returns 403 if not owner
- Returns 404 if resource not found

---

### rateLimitLogin

Rate limit login attempts

**Usage:**

```javascript
router.post("/login", rateLimitLogin, login);
```

**Behavior:**

- Tracks failed login attempts per email
- Maximum 5 attempts per 15 minutes
- Returns 429 if limit exceeded
- Resets after timeout or successful login

---

## Protected Routes

### Events

- `GET /api/events` - Public (optionalAuth)
- `GET /api/events/upcoming` - Public (optionalAuth)
- `GET /api/events/:id` - Public (optionalAuth)
- `POST /api/events` - **Protected** (admin, anggota only)
- `PUT /api/events/:id` - **Protected** (owner or admin)
- `DELETE /api/events/:id` - **Protected** (owner or admin)

### Registrations

- `GET /api/registrations/event/:eventId` - Public (optionalAuth)
- `POST /api/registrations` - **Protected**
- `POST /api/registrations/with-payment` - **Protected**
- `GET /api/registrations/user/:userId` - **Protected**
- `PUT /api/registrations/:id` - **Protected**
- `DELETE /api/registrations/:id` - **Protected**

### Payments

- `POST /api/payments/notification` - Public (Midtrans webhook)
- `POST /api/payments` - **Protected**
- `GET /api/payments/:id` - **Protected**
- `GET /api/payments/user/:userId` - **Protected**
- `PUT /api/payments/:id` - **Protected** (admin only)

### Anggota

- `GET /api/anggota/stats` - Public
- `POST /api/anggota` - **Protected** (anggota role only)
- `GET /api/anggota` - **Protected**
- `GET /api/anggota/:id` - **Protected**
- `PUT /api/anggota/:id` - **Protected** (owner or admin)
- `DELETE /api/anggota/:id` - **Protected** (admin only)

---

## CORS Configuration

### Allowed Origins

Configure in `.env`:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Features

- ✅ Origin whitelist
- ✅ Credentials support
- ✅ Preflight requests handled
- ✅ Custom error for blocked origins

### Allowed Methods

- GET, POST, PUT, DELETE, PATCH, OPTIONS

### Allowed Headers

- Content-Type, Authorization

---

## Environment Variables

Required in `.env`:

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

**Security Notes:**

- `JWT_SECRET` must be strong and random
- Never commit `.env` to version control
- Use different secrets for development/production
- Rotate secrets periodically

---

## Usage Examples

### Example 1: Register and Login

**Step 1: Register**

```bash
POST http://localhost:8015/api/auth/register
Content-Type: application/json

{
  "nama": "Budi Santoso",
  "email": "budi@example.com",
  "password": "password123",
  "role": "anggota"
}
```

**Step 2: Login**

```bash
POST http://localhost:8015/api/auth/login
Content-Type: application/json

{
  "email": "budi@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {...}
  }
}
```

**Step 3: Use Token**

```bash
GET http://localhost:8015/api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Example 2: Create Event (Protected)

```bash
POST http://localhost:8015/api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Workshop Pencak Silat",
  "eventDate": "2026-03-15T10:00:00",
  "location": "Jakarta",
  "capacity": 50,
  "isFree": true,
  "status": "published",
  "organizerId": 1
}
```

**Without token:** Returns 401
**With user role:** Returns 403 (only admin/anggota can create)
**With anggota role:** Returns 201 (success)

---

### Example 3: Frontend Integration

```javascript
// Store token after login
localStorage.setItem("token", data.token);

// Add to all requests
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};

// Make authenticated request
fetch("http://localhost:8015/api/auth/profile", { headers })
  .then((res) => res.json())
  .then((data) => console.log(data));

// Handle 401 (token expired)
if (response.status === 401) {
  localStorage.removeItem("token");
  window.location.href = "/login";
}
```

---

## Error Handling

### Authentication Errors

**401 Unauthorized:**

```json
{
  "success": false,
  "message": "No token provided. Please login to access this resource."
}
```

**401 Invalid Token:**

```json
{
  "success": false,
  "message": "Invalid token"
}
```

**401 Token Expired:**

```json
{
  "success": false,
  "message": "Token expired. Please login again."
}
```

### Authorization Errors

**403 Forbidden:**

```json
{
  "success": false,
  "message": "Access denied. Required role: admin or anggota"
}
```

**403 Not Owner:**

```json
{
  "success": false,
  "message": "Access denied. You do not own this resource."
}
```

### Rate Limiting

**429 Too Many Requests:**

```json
{
  "success": false,
  "message": "Too many login attempts. Please try again in 12 minutes."
}
```

---

## Security Best Practices

### ✅ Implemented

1. **Password Hashing** - bcrypt with salt rounds
2. **JWT Expiration** - Tokens expire after 7 days
3. **Rate Limiting** - Login attempts limited
4. **CORS Whitelist** - Only allowed origins
5. **Secure Error Messages** - No information leakage
6. **Token Verification** - Every request validated
7. **Role-Based Access** - Granular permissions

### 🔒 Recommendations

1. **HTTPS Only** - Use HTTPS in production
2. **Refresh Tokens** - Implement for better UX
3. **Token Blacklist** - For logout functionality
4. **2FA** - Two-factor authentication (future)
5. **Email Verification** - Verify email on registration (future)
6. **Password Reset** - Forgot password flow (future)

---

## Testing

### Test Registration

```bash
curl -X POST http://localhost:8015/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test User","email":"test@example.com","password":"password123"}'
```

### Test Login

```bash
curl -X POST http://localhost:8015/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Protected Route

```bash
curl -X GET http://localhost:8015/api/auth/profile \
  -H "Authorization: Bearer <your_token>"
```

### Test CORS

```bash
curl -X GET http://localhost:8015/api/events \
  -H "Origin: http://localhost:3000" \
  -v
```

---

## Summary

✅ **Complete authentication system implemented:**

- Register and login with JWT
- Role-based access control (admin, user, anggota)
- Secure password hashing
- Rate limiting for login
- CORS with origin whitelist
- Protected routes across all endpoints

✅ **Security features:**

- Token expiration
- Ownership verification
- Secure error messages
- Environment-based configuration

✅ **Developer-friendly:**

- Clear error messages
- Comprehensive middleware
- Flexible authorization
- Optional authentication support

**System is production-ready with industry-standard security practices!**
