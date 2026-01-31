# Donation API - Documentation

## Overview

Sistem donasi lengkap dengan campaign management, donation tracking, dan Midtrans payment integration untuk Event Management API.

## Features

✅ **Campaign Management**

- Create, update, delete donation campaigns
- Category-based organization (pendidikan, kesehatan, bencana, infrastruktur, umum)
- Target amount and deadline tracking
- Progress percentage calculation
- Urgent campaign flag

✅ **Donation Processing**

- Support authenticated and anonymous donations
- Multiple payment methods via Midtrans
- Custom donor name and message
- Real-time payment status updates
- Automatic campaign amount update

✅ **Payment Integration**

- Midtrans Snap API
- Webhook for status updates
- Support all Midtrans payment methods
- Secure transaction handling

✅ **Statistics & Reporting**

- Total donations per campaign
- Donor list with pagination
- Category-based statistics
- Recent donations tracking

---

## Database Schema

### DonationCampaigns Table

```sql
- id (PK)
- title (String, required)
- description (Text)
- category (ENUM: pendidikan, kesehatan, bencana, infrastruktur, umum)
- targetAmount (Decimal 15,2)
- currentAmount (Decimal 15,2, default: 0)
- startDate (Date, default: NOW)
- endDate (Date, nullable)
- status (ENUM: draft, active, completed, cancelled)
- imageUrl (Text)
- organizerId (FK to Users)
- isUrgent (Boolean, default: false)
```

### Donations Table

```sql
- id (PK)
- campaignId (FK to DonationCampaigns, nullable)
- userId (FK to Users, nullable)
- donorName (String, required)
- donorEmail (String)
- donorPhone (String)
- amount (Decimal 15,2, required)
- message (Text)
- isAnonymous (Boolean, default: false)
- paymentMethod (ENUM: bank_transfer, credit_card, gopay, shopeepay, qris, other)
- paymentStatus (ENUM: pending, settlement, cancel, expire, failure)
- transactionId (String, unique)
- midtransOrderId (String, unique)
- midtransTransactionId (String)
- paidAt (Date)
```

---

## Campaign Endpoints

### GET /api/donations/campaigns

Get all donation campaigns

**Query Parameters:**

- `status` - Filter by status (draft, active, completed, cancelled)
- `category` - Filter by category
- `isUrgent` - Filter urgent campaigns (true/false)
- `search` - Search by title
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Bangun Gedung Latihan Silat",
      "description": "...",
      "category": "infrastruktur",
      "targetAmount": "50000000.00",
      "currentAmount": "15000000.00",
      "startDate": "2026-02-01T00:00:00.000Z",
      "endDate": "2026-12-31T00:00:00.000Z",
      "status": "active",
      "imageUrl": "...",
      "isUrgent": false,
      "percentageReached": 30,
      "daysLeft": 334,
      "organizer": {
        "id": 1,
        "nama": "Admin",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### GET /api/donations/campaigns/:id

Get campaign detail with statistics

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Bangun Gedung Latihan Silat",
    "targetAmount": "50000000.00",
    "currentAmount": "15000000.00",
    "percentageReached": 30,
    "totalDonors": 150,
    "organizer": {...},
    "donations": [
      {
        "id": 1,
        "donorName": "John Doe",
        "amount": "100000.00",
        "message": "Semoga bermanfaat",
        "isAnonymous": false,
        "paidAt": "2026-02-01T10:00:00.000Z"
      }
    ]
  }
}
```

---

### POST /api/donations/campaigns

Create new campaign (admin, anggota only)

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "title": "Bangun Gedung Latihan Silat",
  "description": "Pembangunan gedung latihan untuk anggota silat",
  "category": "infrastruktur",
  "targetAmount": 50000000,
  "startDate": "2026-02-01",
  "endDate": "2026-12-31",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Validation:**

- `title` and `targetAmount` required
- `targetAmount` must be > 0
- `category` must be valid enum value
- `endDate` must be after `startDate` (if provided)

**Response (201):**

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": 1,
    "title": "...",
    "status": "draft",
    "organizerId": 1,
    "organizer": {...}
  }
}
```

---

### PUT /api/donations/campaigns/:id

Update campaign (owner or admin)

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "title": "Updated Title",
  "status": "active",
  "endDate": "2026-12-31"
}
```

**Notes:**

- Cannot update `organizerId`
- Cannot manually update `currentAmount`
- Only owner or admin can update

---

### DELETE /api/donations/campaigns/:id

Cancel campaign (owner or admin)

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Campaign cancelled successfully"
}
```

**Notes:**

- Sets status to 'cancelled'
- Does not delete from database
- Only owner or admin can cancel

---

### GET /api/donations/campaigns/:id/donors

Get list of donors for a campaign

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "donorName": "John Doe",
      "amount": "100000.00",
      "message": "Semoga bermanfaat",
      "isAnonymous": false,
      "paidAt": "2026-02-01T10:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

---

## Donation Endpoints

### POST /api/donations

Create donation and get payment token

**Headers (Optional):**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "campaignId": 1,
  "amount": 100000,
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "donorPhone": "081234567890",
  "message": "Semoga bermanfaat",
  "isAnonymous": false,
  "paymentMethod": "gopay"
}
```

**Validation:**

- `amount`, `donorName`, `paymentMethod` required
- `amount` minimum 1000
- `campaignId` must exist and be active (if provided)
- `paymentMethod` must be valid enum value

**Response (201):**

```json
{
  "success": true,
  "message": "Donation created successfully",
  "data": {
    "donation": {
      "id": 1,
      "amount": "100000.00",
      "donorName": "John Doe",
      "paymentStatus": "pending"
    },
    "midtransToken": "xxx-xxx-xxx",
    "midtransRedirectUrl": "https://app.midtrans.com/snap/v2/vtweb/xxx"
  }
}
```

**Notes:**

- Can be called without authentication for anonymous donations
- If authenticated, `userId` will be attached
- Returns Midtrans token for payment
- Frontend should redirect to `midtransRedirectUrl` or use Snap.js

---

### POST /api/donations/notification

Midtrans webhook for payment notification

**Request Body:**

```json
{
  "order_id": "DONATION-1738358400000-123",
  "transaction_status": "settlement",
  "transaction_id": "xxx-xxx-xxx",
  "fraud_status": "accept"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Notification processed"
}
```

**Notes:**

- Public endpoint (no authentication)
- Called by Midtrans server
- Updates donation status
- Automatically updates campaign `currentAmount` on settlement

---

### GET /api/donations

Get all donations (admin only)

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `campaignId` - Filter by campaign
- `userId` - Filter by user
- `paymentStatus` - Filter by status
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "amount": "100000.00",
      "donorName": "John Doe",
      "paymentStatus": "settlement",
      "campaign": {
        "id": 1,
        "title": "..."
      },
      "donor": {
        "id": 1,
        "nama": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {...}
}
```

---

### GET /api/donations/:id

Get donation detail

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "amount": "100000.00",
    "donorName": "John Doe",
    "donorEmail": "john@example.com",
    "message": "Semoga bermanfaat",
    "paymentStatus": "settlement",
    "paymentMethod": "gopay",
    "paidAt": "2026-02-01T10:00:00.000Z",
    "campaign": {...},
    "donor": {...}
  }
}
```

---

### GET /api/donations/user/:userId

Get user's donation history

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "amount": "100000.00",
      "paymentStatus": "settlement",
      "paidAt": "2026-02-01T10:00:00.000Z",
      "campaign": {
        "id": 1,
        "title": "...",
        "category": "infrastruktur"
      }
    }
  ],
  "pagination": {...}
}
```

**Notes:**

- User can only view their own donations
- Admin can view any user's donations

---

### GET /api/donations/stats

Get donation statistics

**Response:**

```json
{
  "success": true,
  "data": {
    "totalDonations": "50000000.00",
    "totalDonors": 500,
    "byCategory": [
      {
        "category": "infrastruktur",
        "total": "20000000.00"
      },
      {
        "category": "pendidikan",
        "total": "15000000.00"
      }
    ],
    "recentDonations": [
      {
        "id": 1,
        "donorName": "John Doe",
        "amount": "100000.00",
        "isAnonymous": false,
        "paidAt": "2026-02-01T10:00:00.000Z",
        "campaign": {
          "id": 1,
          "title": "..."
        }
      }
    ]
  }
}
```

---

## Payment Flow

### 1. Create Donation

```bash
POST /api/donations
{
  "campaignId": 1,
  "amount": 100000,
  "donorName": "John Doe",
  "paymentMethod": "gopay"
}
```

### 2. Get Midtrans Token

```json
{
  "midtransToken": "xxx-xxx-xxx",
  "midtransRedirectUrl": "https://app.midtrans.com/snap/..."
}
```

### 3. Frontend Integration

**Option A: Redirect**

```javascript
window.location.href = response.data.midtransRedirectUrl;
```

**Option B: Snap.js**

```javascript
snap.pay(response.data.midtransToken, {
  onSuccess: function (result) {
    console.log("Payment success");
  },
  onPending: function (result) {
    console.log("Payment pending");
  },
  onError: function (result) {
    console.log("Payment error");
  },
});
```

### 4. Midtrans Webhook

- Midtrans calls `/api/donations/notification`
- Donation status updated
- Campaign `currentAmount` updated (if settlement)

### 5. Check Status

```bash
GET /api/donations/:id
```

---

## Business Logic

### Campaign Status Flow

```
draft → active → completed
              ↘ cancelled
```

### Donation Status Flow

```
pending → settlement (update campaign amount)
        → cancel/expire/failure (no update)
```

### Auto-Update Campaign Amount

When donation status changes to `settlement`:

1. Hook in Donation model triggered
2. Campaign `currentAmount` incremented by donation amount
3. Transaction ensures data consistency

---

## Security & Privacy

### Anonymous Donations

- No authentication required
- `userId` will be null
- `donorName` still required
- Email/phone optional

### Authenticated Donations

- Optional authentication
- `userId` attached if logged in
- Can view donation history

### Campaign Ownership

- Only owner or admin can update/cancel
- Organizer cannot be changed
- Current amount cannot be manually updated

---

## Usage Examples

### Example 1: Create Campaign

```bash
POST http://localhost:8015/api/donations/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Bangun Gedung Latihan",
  "description": "Pembangunan gedung latihan untuk anggota",
  "category": "infrastruktur",
  "targetAmount": 50000000,
  "startDate": "2026-02-01",
  "endDate": "2026-12-31"
}
```

### Example 2: Make Anonymous Donation

```bash
POST http://localhost:8015/api/donations
Content-Type: application/json

{
  "campaignId": 1,
  "amount": 100000,
  "donorName": "Hamba Allah",
  "message": "Semoga bermanfaat",
  "isAnonymous": true,
  "paymentMethod": "gopay"
}
```

### Example 3: Make Authenticated Donation

```bash
POST http://localhost:8015/api/donations
Authorization: Bearer <token>
Content-Type: application/json

{
  "campaignId": 1,
  "amount": 500000,
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "message": "Untuk pembangunan gedung",
  "paymentMethod": "bank_transfer"
}
```

### Example 4: Get Campaign Progress

```bash
GET http://localhost:8015/api/donations/campaigns/1

Response:
{
  "id": 1,
  "title": "Bangun Gedung Latihan",
  "targetAmount": "50000000.00",
  "currentAmount": "15000000.00",
  "percentageReached": 30,
  "daysLeft": 334,
  "totalDonors": 150
}
```

---

## Error Handling

### Validation Errors

```json
{
  "success": false,
  "message": "Amount, donor name, and payment method are required"
}
```

### Campaign Not Found

```json
{
  "success": false,
  "message": "Campaign not found"
}
```

### Campaign Not Active

```json
{
  "success": false,
  "message": "Campaign is not active"
}
```

### Minimum Donation

```json
{
  "success": false,
  "message": "Minimum donation amount is Rp 1.000"
}
```

### Authorization Error

```json
{
  "success": false,
  "message": "Access denied. You do not own this campaign."
}
```

---

## Summary

✅ **Complete donation system implemented:**

- Campaign management with progress tracking
- Donation processing with Midtrans integration
- Support for anonymous and authenticated donations
- Automatic campaign amount updates
- Comprehensive statistics and reporting

✅ **Security features:**

- Role-based access control
- Ownership verification
- Optional authentication for donations
- Privacy for anonymous donors

✅ **Developer-friendly:**

- Clear API endpoints
- Comprehensive validation
- Detailed error messages
- Easy Midtrans integration

**The donation feature is fully functional and ready for production use!**
