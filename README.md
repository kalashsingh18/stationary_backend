# School Management and Sales API

A comprehensive REST API built with Express.js and MongoDB Atlas for managing school sales, students, inventory, purchases, and commission tracking.

## Features

- **Authentication & Authorization** - JWT-based authentication for admin users
- **School Management** - Manage schools with commission rates and detailed dashboards
- **Student Management** - CRUD operations plus bulk upload via Excel
- **Product & Category Management** - Organize products with GST rates and stock tracking
- **Supplier Management** - Maintain supplier records
- **Purchase Management** - Track purchases with automatic inventory updates
- **Invoice/Sales Management** - Generate invoices with automatic stock deduction and commission calculation
- **Commission Tracking** - School-wise commission tracking with settlement management
- **Comprehensive Reports** - Sales reports, school performance, and inventory valuation
- **PDF Generation** - Printable invoice PDFs

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **PDFKit** - PDF generation
- **XLSX** - Excel file processing
- **Multer** - File upload handling

## Total API Endpoints: 45

### Breakdown by Module:
1. **Auth** - 2 endpoints
2. **Dashboard** - 1 endpoint
3. **Schools** - 5 endpoints
4. **Students** - 6 endpoints (including bulk upload)
5. **Categories** - 4 endpoints
6. **Products** - 5 endpoints
7. **Suppliers** - 5 endpoints
8. **Purchases** - 5 endpoints
9. **Invoices** - 5 endpoints (including PDF generation)
10. **Commissions** - 4 endpoints
11. **Reports** - 3 endpoints

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. Clone the repository or extract the files

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:

Edit the `.env` file and add your MongoDB credentials:
```env
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.ktq5916.mongodb.net/?appName=Cluster0
```

4. Seed the database:
```bash
npm run seed
```

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Default Login

After seeding, use these credentials:
- **Email:** admin@example.com
- **Password:** admin123

## Documentation

- [Quick Start Guide](./QUICK_START.md) - Get up and running quickly
- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference with examples

## Project Structure

```
├── server.js                    # Main application entry point
├── config/
│   └── database.js              # MongoDB connection configuration
├── models/                      # Mongoose schemas (9 models)
│   ├── Admin.model.js
│   ├── School.model.js
│   ├── Student.model.js
│   ├── Category.model.js
│   ├── Product.model.js
│   ├── Supplier.model.js
│   ├── Purchase.model.js
│   ├── Invoice.model.js
│   └── Commission.model.js
├── controllers/                 # Business logic (12 controllers)
│   ├── auth.controller.js
│   ├── dashboard.controller.js
│   ├── school.controller.js
│   ├── student.controller.js
│   ├── category.controller.js
│   ├── product.controller.js
│   ├── supplier.controller.js
│   ├── purchase.controller.js
│   ├── invoice.controller.js
│   ├── commission.controller.js
│   └── report.controller.js
├── routes/                      # API routes (11 route files)
│   ├── auth.routes.js
│   ├── dashboard.routes.js
│   ├── school.routes.js
│   ├── student.routes.js
│   ├── category.routes.js
│   ├── product.routes.js
│   ├── supplier.routes.js
│   ├── purchase.routes.js
│   ├── invoice.routes.js
│   ├── commission.routes.js
│   └── report.routes.js
├── middleware/                  # Custom middleware
│   ├── auth.js                  # JWT authentication
│   └── errorHandler.js          # Global error handling
└── scripts/
    └── seed.js                  # Database seeding script
```

## Key Features Explained

### Automatic Stock Management
- Purchase orders automatically **increase** product stock
- Invoices automatically **decrease** product stock
- Low stock alerts on the dashboard

### Commission Calculation
- Commissions calculated automatically on invoice creation
- Based on base amount (excluding GST)
- School-wise commission rate configuration
- Monthly commission tracking and settlement

### Student Bulk Upload
- Excel file support for bulk student import
- Automatic validation and error reporting
- School-wise upload

### Invoice PDF Generation
- Professional invoice PDFs
- Includes school details, student info, and itemized products
- Automatic calculation of subtotal, GST, and total

### Comprehensive Reports
- Daily/Weekly/Monthly sales reports
- School performance analysis
- Class-wise sales breakdown
- Inventory valuation and low stock alerts
- Top-selling products

## API Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token_here>
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

## License

ISC

## Support

For detailed API documentation and examples, refer to:
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [QUICK_START.md](./QUICK_START.md)
