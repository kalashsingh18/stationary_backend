# Quick Start Guide

## Step 1: Configure Database Connection

Update the `.env` file with your MongoDB Atlas credentials:

```env
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.ktq5916.mongodb.net/?appName=Cluster0
```

Replace `<db_username>` and `<db_password>` with your actual MongoDB Atlas credentials.

## Step 2: Seed the Database

Run the seed script to create initial data (admin user, sample schools, and categories):

```bash
npm run seed
```

This will create:
- Admin user (email: admin@example.com, password: admin123)
- 2 sample schools
- 5 product categories

## Step 3: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on http://localhost:3000

## Step 4: Test the API

### Login to get authentication token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### Use the token for authenticated requests:

```bash
curl http://localhost:3000/api/schools \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Project Structure

```
project/
├── server.js              # Main application file
├── config/
│   └── database.js        # MongoDB connection
├── models/                # Mongoose schemas
│   ├── Admin.model.js
│   ├── School.model.js
│   ├── Student.model.js
│   ├── Category.model.js
│   ├── Product.model.js
│   ├── Supplier.model.js
│   ├── Purchase.model.js
│   ├── Invoice.model.js
│   └── Commission.model.js
├── controllers/           # Route handlers
├── routes/               # API routes
├── middleware/           # Custom middleware
└── scripts/
    └── seed.js           # Database seeding script
```

## API Endpoints Summary

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout

### Dashboard
- GET `/api/dashboard/summary` - Get dashboard summary

### School Management (5 endpoints)
- GET `/api/schools` - List all schools
- GET `/api/schools/:id` - Get school details
- POST `/api/schools` - Create school
- PUT `/api/schools/:id` - Update school
- DELETE `/api/schools/:id` - Delete school

### Student Management (6 endpoints)
- GET `/api/students` - List students
- GET `/api/students/:id` - Get student details
- POST `/api/students` - Create student
- PUT `/api/students/:id` - Update student
- DELETE `/api/students/:id` - Delete student
- POST `/api/students/bulk-upload` - Bulk upload via Excel

### Category Management (4 endpoints)
- GET `/api/categories` - List categories
- POST `/api/categories` - Create category
- PUT `/api/categories/:id` - Update category
- DELETE `/api/categories/:id` - Delete category

### Product Management (5 endpoints)
- GET `/api/products` - List products
- GET `/api/products/:id` - Get product details
- POST `/api/products` - Create product
- PUT `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Delete product

### Supplier Management (5 endpoints)
- GET `/api/suppliers` - List suppliers
- GET `/api/suppliers/:id` - Get supplier details
- POST `/api/suppliers` - Create supplier
- PUT `/api/suppliers/:id` - Update supplier
- DELETE `/api/suppliers/:id` - Delete supplier

### Purchase Management (5 endpoints)
- GET `/api/purchases` - List purchases
- GET `/api/purchases/:id` - Get purchase details
- POST `/api/purchases` - Create purchase (auto-updates stock)
- PUT `/api/purchases/:id` - Update purchase
- PATCH `/api/purchases/:id/payment` - Update payment status

### Invoice/Sales Management (5 endpoints)
- GET `/api/invoices` - List invoices
- GET `/api/invoices/:id` - Get invoice details
- POST `/api/invoices` - Create invoice (auto-deducts stock, creates commission)
- GET `/api/invoices/:id/pdf` - Download PDF invoice
- GET `/api/invoices/search-student` - Search students for POS

### Commission Management (4 endpoints)
- GET `/api/commissions` - List commissions
- GET `/api/commissions/school/:id` - School-wise commissions
- PATCH `/api/commissions/:id/settle` - Settle commission
- GET `/api/commissions/summary` - Commission summary

### Reports (3 endpoints)
- GET `/api/reports/sales` - Sales report
- GET `/api/reports/school-performance` - School performance
- GET `/api/reports/inventory-valuation` - Inventory valuation

## Total Endpoints: 45

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
