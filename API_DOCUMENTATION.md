# School Management API Documentation

A comprehensive REST API for managing school sales, students, inventory, and commissions.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication using JWT Bearer tokens.

Include the token in the Authorization header:
```
Authorization: Bearer <your_token_here>
```

---

## 1. Authentication

### POST /api/auth/login
Login to get authentication token

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "role": "superadmin"
  }
}
```

### POST /api/auth/logout
Logout (invalidate session)

---

## 2. Dashboard

### GET /api/dashboard/summary
Get dashboard summary with today's and month's sales, low stock alerts, pending commissions, etc.

**Response:**
```json
{
  "success": true,
  "data": {
    "todaySales": { "amount": 5000, "count": 10 },
    "monthSales": { "amount": 50000, "count": 100 },
    "lowStockAlerts": { "count": 5, "products": [...] },
    "pendingCommissions": { "amount": 5000, "count": 20 },
    "recentInvoices": [...],
    "schoolOverview": [...]
  }
}
```

---

## 3. School Management

### GET /api/schools
List all schools with pagination, search, and filtering

**Query Parameters:**
- `search` - Search by name or code
- `isActive` - Filter by active status (true/false)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### GET /api/schools/:id
Get single school details with dashboard (total students, class-wise breakdown, sales, commission)

### POST /api/schools
Create a new school

**Request Body:**
```json
{
  "name": "St. Mary High School",
  "code": "SMHS001",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "contact": {
    "phone": "022-12345678",
    "email": "info@stmary.edu"
  },
  "principalName": "Dr. John Smith",
  "commissionRate": 10
}
```

### PUT /api/schools/:id
Update a school

### DELETE /api/schools/:id
Delete a school (only if no students exist)

---

## 4. Student Management

### GET /api/students
List students with filtering

**Query Parameters:**
- `school` - Filter by school ID
- `class` - Filter by class
- `section` - Filter by section
- `search` - Search by name or roll number
- `page` - Page number
- `limit` - Items per page

### GET /api/students/:id
Get single student details

### POST /api/students
Create a student

**Request Body:**
```json
{
  "rollNumber": "2024001",
  "name": "John Doe",
  "school": "school_id",
  "class": "10",
  "section": "A",
  "fatherName": "Robert Doe",
  "contact": {
    "phone": "9876543210",
    "email": "john@example.com"
  }
}
```

### PUT /api/students/:id
Update a student

### DELETE /api/students/:id
Delete a student

### POST /api/students/bulk-upload
Bulk upload students via Excel file

**Request:**
- Content-Type: multipart/form-data
- Body:
  - `file` - Excel file
  - `schoolId` - School ID

**Excel Format:**
Columns: rollNumber, name, class, section, fatherName, motherName, phone, email

---

## 5. Category Management

### GET /api/categories
List all categories

### POST /api/categories
Create a category

**Request Body:**
```json
{
  "name": "Books",
  "description": "Textbooks and reference books"
}
```

### PUT /api/categories/:id
Update a category

### DELETE /api/categories/:id
Delete a category (only if no products exist)

---

## 6. Product Management

### GET /api/products
List products with filtering

**Query Parameters:**
- `category` - Filter by category ID
- `stockStatus` - Filter by stock status (low/out)
- `search` - Search by name or SKU
- `page` - Page number
- `limit` - Items per page

### GET /api/products/:id
Get single product details

### POST /api/products
Create a product

**Request Body:**
```json
{
  "name": "Mathematics Textbook",
  "sku": "MATH-10-001",
  "category": "category_id",
  "description": "Class 10 Mathematics",
  "basePrice": 200,
  "gstRate": 18,
  "sellingPrice": 236,
  "stock": 100,
  "minStockLevel": 10
}
```

### PUT /api/products/:id
Update a product

### DELETE /api/products/:id
Delete a product

---

## 7. Supplier Management

### GET /api/suppliers
List all suppliers

### GET /api/suppliers/:id
Get single supplier

### POST /api/suppliers
Create a supplier

**Request Body:**
```json
{
  "name": "ABC Publishers",
  "code": "ABC001",
  "contact": {
    "phone": "011-12345678",
    "email": "abc@publisher.com",
    "contactPerson": "John Smith"
  },
  "address": {
    "street": "123 Publisher Street",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001"
  },
  "gstNumber": "29ABCDE1234F1Z5"
}
```

### PUT /api/suppliers/:id
Update a supplier

### DELETE /api/suppliers/:id
Delete a supplier

---

## 8. Purchase Management

### GET /api/purchases
List purchases with filtering

**Query Parameters:**
- `supplier` - Filter by supplier ID
- `status` - Filter by payment status (pending/partial/paid)
- `startDate` - Filter from date
- `endDate` - Filter to date
- `page` - Page number
- `limit` - Items per page

### GET /api/purchases/:id
Get single purchase with line items

### POST /api/purchases
Create purchase order (auto-updates inventory)

**Request Body:**
```json
{
  "supplier": "supplier_id",
  "items": [
    {
      "product": "product_id",
      "quantity": 50,
      "unitPrice": 150
    }
  ],
  "purchaseDate": "2024-01-15",
  "notes": "First order of the month"
}
```

### PUT /api/purchases/:id
Update purchase

### PATCH /api/purchases/:id/payment
Mark purchase as paid

**Request Body:**
```json
{
  "paidAmount": 7500,
  "paymentDate": "2024-01-20"
}
```

---

## 9. Invoice / Sales Management

### GET /api/invoices
List invoices with filtering

**Query Parameters:**
- `school` - Filter by school ID
- `student` - Filter by student ID
- `startDate` - Filter from date
- `endDate` - Filter to date
- `page` - Page number
- `limit` - Items per page

### GET /api/invoices/:id
Get single invoice with line items

### POST /api/invoices
Create invoice (auto-deducts stock, auto-calculates commission)

**Request Body:**
```json
{
  "school": "school_id",
  "student": "student_id",
  "items": [
    {
      "product": "product_id",
      "quantity": 2
    }
  ],
  "paymentMethod": "cash",
  "notes": "Paid in full"
}
```

### GET /api/invoices/:id/pdf
Generate and download printable PDF invoice

### GET /api/invoices/search-student
Search student by roll number or name (used in POS)

**Query Parameters:**
- `query` - Search term

---

## 10. Commission Management

### GET /api/commissions
List commissions with filtering

**Query Parameters:**
- `school` - Filter by school ID
- `status` - Filter by status (pending/settled)
- `month` - Filter by month (1-12)
- `year` - Filter by year
- `page` - Page number
- `limit` - Items per page

### GET /api/commissions/school/:id
School-wise commission detail with monthly breakdown

### PATCH /api/commissions/:id/settle
Mark commission as settled

**Request Body:**
```json
{
  "paymentReference": "TXN123456",
  "settlementDate": "2024-01-31",
  "notes": "January commission settled"
}
```

### GET /api/commissions/summary
Aggregated commission summary (total pending, total settled)

---

## 11. Reports

### GET /api/reports/sales
Sales report with date range filter

**Query Parameters:**
- `period` - daily/weekly/monthly
- `startDate` - Custom start date
- `endDate` - Custom end date

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "dailySales": [...],
    "summary": {
      "totalSales": 50000,
      "totalCommission": 5000,
      "totalInvoices": 100
    },
    "topProducts": [...]
  }
}
```

### GET /api/reports/school-performance
School-wise performance report

**Query Parameters:**
- `startDate` - Filter from date
- `endDate` - Filter to date

### GET /api/reports/inventory-valuation
Inventory stock valuation report

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalProducts": 50,
      "totalStock": 5000,
      "totalValue": 500000,
      "lowStockCount": 5
    },
    "products": [...],
    "categoryWiseValuation": [...],
    "lowStockProducts": [...]
  }
}
```

---

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=3000
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.ktq5916.mongodb.net/?appName=Cluster0
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

3. Seed the database with initial data:
```bash
npm run seed
```

4. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Default Login Credentials

After running the seed script:
- **Email:** admin@example.com
- **Password:** admin123

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error
