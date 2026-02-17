import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import schoolRoutes from './routes/school.routes.js';
import studentRoutes from './routes/student.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import reportRoutes from './routes/report.routes.js';
import adminRoutes from './routes/admin.routes.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();

connectDB();

// ✅ THIS MUST BE FIRST - before any other middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Respond to preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'School Management API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admins', adminRoutes);

app.use(errorHandler);

export default app;