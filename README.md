# Event Management API - Documentation

## Overview

Backend API untuk sistem manajemen event/seminar dengan fitur gratis dan berbayar, termasuk integrasi pembayaran Midtrans.

## Database Schema

### Tables

1. **Users** - Data pengguna (existing)
2. **Events** - Data event/seminar
3. **EventRegistrations** - Data pendaftaran peserta
4. **Payments** - Data pembayaran dengan Midtrans

### Relationships

- Event `belongsTo` User (organizer)
- Event `hasMany` EventRegistration
- Event `hasMany` Payment
- EventRegistration `belongsTo` Event
- EventRegistration `belongsTo` User
- EventRegistration `belongsTo` Payment
- Payment `belongsTo` Event
- Payment `belongsTo` User
- Payment `hasOne` EventRegistration

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```env
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Start Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:8015`

## API Endpoints

### Events

#### GET /api/events

Get all events dengan filtering dan pagination

**Query Parameters:**

- `status` - Filter by status (draft, published, ongoing, completed, cancelled)
- `isFree` - Filter by free/paid (true/false)
- `eventType` - Filter by type (seminar, workshop, conference, webinar)
- `search` - Search in title and description
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

#### GET /api/events/upcoming

Get upcoming published events

#### GET /api/events/:id

Get event detail by ID

#### POST /api/events

Create new event

**Request Body:**

```json
{
  "title": "Workshop Node.js",
  "description": "Belajar Node.js dari dasar",
  "eventType": "workshop",
  "eventDate": "2026-03-15T10:00:00",
  "location": "Jakarta",
  "capacity": 50,
  "isFree": true,
  "organizerId": 1
}
```

#### PUT /api/events/:id

Update event

#### DELETE /api/events/:id

Cancel event (soft delete)

#### GET /api/events/organizer/:organizerId

Get events by organizer

### Registrations

#### POST /api/registrations

Register to free event

**Request Body:**

```json
{
  "eventId": 1,
  "userId": 1,
  "notes": "Saya tertarik mengikuti event ini"
}
```

#### POST /api/registrations/with-payment

Register to paid event with payment

**Request Body:**

```json
{
  "eventId": 2,
  "userId": 1,
  "paymentId": 1,
  "notes": "Optional notes"
}
```

#### GET /api/registrations/user/:userId

Get all registrations by user

#### GET /api/registrations/event/:eventId

Get all registrations for an event

#### PUT /api/registrations/:id

Update registration status

**Request Body:**

```json
{
  "status": "attended"
}
```

#### DELETE /api/registrations/:id

Cancel registration

#### GET /api/registrations/check/:eventId/:userId

Check if user is registered

### Payments

#### POST /api/payments

Create payment and get Midtrans token

**Request Body:**

```json
{
  "eventId": 2,
  "userId": 1,
  "paymentMethod": "credit_card"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "payment": {...},
    "midtransToken": "xxx-xxx-xxx",
    "midtransRedirectUrl": "https://app.midtrans.com/snap/v2/..."
  }
}
```

#### POST /api/payments/notification

Midtrans webhook endpoint (untuk notifikasi pembayaran)

#### PUT /api/payments/:id

Update payment status manually

#### GET /api/payments/:id

Get payment detail

#### GET /api/payments/user/:userId

Get payment history by user

#### GET /api/payments/status/:orderId

Check payment status with Midtrans

## Usage Flow

### Flow Event Gratis

1. **Create Event**

   ```
   POST /api/events
   {
     "title": "Seminar Gratis",
     "isFree": true,
     "price": 0,
     ...
   }
   ```

2. **User Register**

   ```
   POST /api/registrations
   {
     "eventId": 1,
     "userId": 1
   }
   ```

3. **Check Registration**
   ```
   GET /api/registrations/check/1/1
   ```

### Flow Event Berbayar

1. **Create Paid Event**

   ```
   POST /api/events
   {
     "title": "Workshop Premium",
     "isFree": false,
     "price": 150000,
     ...
   }
   ```

2. **Create Payment**

   ```
   POST /api/payments
   {
     "eventId": 2,
     "userId": 1
   }
   ```

   Response akan memberikan `midtransToken` untuk redirect ke halaman pembayaran

3. **User Melakukan Pembayaran**
   - Redirect user ke Midtrans Snap dengan token
   - User melakukan pembayaran
   - Midtrans mengirim notifikasi ke `/api/payments/notification`
   - Status payment otomatis terupdate

4. **Register dengan Payment**
   ```
   POST /api/registrations/with-payment
   {
     "eventId": 2,
     "userId": 1,
     "paymentId": 1
   }
   ```

## Midtrans Integration

### Setup Midtrans

1. Daftar di [Midtrans](https://midtrans.com)
2. Dapatkan Server Key dan Client Key dari dashboard
3. Set di `.env` file
4. Configure webhook URL di Midtrans dashboard: `https://your-domain.com/api/payments/notification`

### Payment Status Flow

- `pending` - Payment dibuat, menunggu user bayar
- `settlement` - Pembayaran berhasil
- `capture` - Pembayaran berhasil (credit card)
- `deny` - Pembayaran ditolak
- `cancel` - Pembayaran dibatalkan
- `expire` - Pembayaran kadaluarsa
- `failure` - Pembayaran gagal
- `refund` - Pembayaran di-refund

## Error Handling

Semua endpoint mengembalikan response dengan format:

```json
{
  "success": true/false,
  "message": "Success/error message",
  "data": {...} // optional
}
```

HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Notes

- Semua endpoint menggunakan JSON format
- Timestamps (`createdAt`, `updatedAt`) otomatis di-handle oleh Sequelize
- Foreign key constraints memastikan data integrity
- Transaction digunakan untuk operasi yang mempengaruhi multiple tables
- Capacity checking otomatis untuk mencegah overbooking
- Duplicate registration prevention dengan unique constraint
