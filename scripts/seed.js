import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.model.js';
import School from '../models/School.model.js';
import Category from '../models/Category.model.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Admin.deleteMany({});
    await School.deleteMany({});
    await Category.deleteMany({});

    const admin = await Admin.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'superadmin'
    });

    console.log('Admin created:', admin.email);

    const schools = await School.create([
      {
        name: 'St. Mary High School',
        code: 'SMHS001',
        address: {
          street: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        },
        contact: {
          phone: '022-12345678',
          email: 'info@stmary.edu'
        },
        principalName: 'Dr. John Smith',
        commissionRate: 10,
        isActive: true
      },
      {
        name: 'Delhi Public School',
        code: 'DPS002',
        address: {
          street: '456 Park Avenue',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001'
        },
        contact: {
          phone: '011-23456789',
          email: 'info@dps.edu'
        },
        principalName: 'Ms. Sarah Johnson',
        commissionRate: 12,
        isActive: true
      }
    ]);

    console.log(`${schools.length} schools created`);

    const categories = await Category.create([
      { name: 'Books', description: 'Textbooks and reference books', isActive: true },
      { name: 'Stationery', description: 'Pens, pencils, notebooks, etc.', isActive: true },
      { name: 'Uniforms', description: 'School uniforms and sports wear', isActive: true },
      { name: 'Bags', description: 'School bags and accessories', isActive: true },
      { name: 'Sports Equipment', description: 'Sports equipment and gear', isActive: true }
    ]);

    console.log(`${categories.length} categories created`);

    console.log('\nSeed data created successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
