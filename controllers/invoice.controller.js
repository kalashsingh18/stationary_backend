import Invoice from '../models/Invoice.model.js';
import Student from '../models/Student.model.js';
import Product from '../models/Product.model.js';
import School from '../models/School.model.js';
import Commission from '../models/Commission.model.js';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import { lookupGstin } from '../utils/gstService.js';

const generateInvoiceNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const lastInvoice = await Invoice.findOne({
    invoiceNumber: new RegExp(`^INV${year}${month}`)
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `INV${year}${month}${String(sequence).padStart(4, '0')}`;
};

export const getAllInvoices = async (req, res, next) => {
  try {
    const { school, student, startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = {};

    // if admin is not superadmin, restrict to their schools
    if (req.admin && req.admin.role !== 'superadmin') {
      const owned = await School.find({ createdBy: req.admin._id }).select('_id');
      const ownedIds = owned.map(s => s._id.toString());
      if (school) {
        if (!ownedIds.includes(school.toString())) {
          return res.status(403).json({ success: false, message: 'Forbidden: school not owned' });
        }
        query.school = school;
      } else {
        query.school = { $in: ownedIds };
      }
    } else if (school) {
      query.school = school;
    }

    if (student) {
      query.student = student;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const invoices = await Invoice.find(query)
      .populate('school', 'name code')
      .populate('student', 'name rollNumber class')
      .populate('items.product', 'name sku')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ invoiceDate: -1 });

    const total = await Invoice.countDocuments(query);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('school', 'name code address contact')
      .populate('student', 'name rollNumber class section')
      .populate('items.product', 'name sku');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // ownership: ensure invoice's school belongs to admin
    if (req.admin && req.admin.role !== 'superadmin') {
      const school = await School.findById(invoice.school).select('createdBy');
      if (!school || !school.createdBy || school.createdBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({ success: false, message: 'Forbidden: not your invoice' });
      }
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { school, student, items, discount, paymentStatus, paymentMethod } = req.body;

    const studentExists = await Student.findById(student).populate('school');
    if (!studentExists) {
      return res.status(400).json({
        success: false,
        message: 'Student not found'
      });
    }

    let schoolExists = null;
    if (school && mongoose.Types.ObjectId.isValid(school)) {
      schoolExists = await School.findById(school);
      if (!schoolExists) {
        return res.status(400).json({
          success: false,
          message: 'School not found'
        });
      }

      // ownership: ensure school belongs to admin
      if (req.admin && req.admin.role !== 'superadmin') {
        if (!schoolExists.createdBy || schoolExists.createdBy.toString() !== req.admin._id.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: cannot create invoice for this school' });
        }
      }
    }

    let subtotal = 0;
    let gstAmount = 0;

    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}. Available: ${product.stock}`
        });
      }

      const itemSubtotal = item.quantity * product.basePrice;
      const itemGst = (itemSubtotal * product.gstRate) / 100;
      const itemTotal = itemSubtotal + itemGst;

      processedItems.push({
        product: item.product,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.basePrice,
        gstRate: product.gstRate,
        gstAmount: itemGst,
        totalPrice: itemTotal
      });

      subtotal += itemSubtotal;
      gstAmount += itemGst;

      product.stock -= item.quantity;
      await product.save();
    }

    const totalAmount = subtotal + gstAmount - (discount || 0);

    let commissionAmount = 0;
    let commissionRate = 0;

    if (schoolExists) {
      commissionRate = schoolExists.commissionRate;
      commissionAmount = (subtotal * commissionRate) / 100;
    }

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      school,
      student,
      items: processedItems,
      subtotal,
      gstAmount,
      discount: discount || 0,
      totalAmount,
      commissionRate,
      commissionAmount,
      paymentStatus: paymentStatus || 'paid',
      paymentMethod: paymentMethod || 'cash',
      invoiceDate: req.body.invoiceDate || new Date(),
      notes: req.body.notes,
      isGstInvoice: req.body.isGstInvoice || false,
      gstNumber: req.body.gstNumber,
      businessInfo: req.body.businessInfo
    });

    if (schoolExists) {
      const invoiceDate = new Date(invoice.invoiceDate);
      await Commission.create({
        school,
        invoice: invoice._id,
        month: invoiceDate.getMonth() + 1,
        year: invoiceDate.getFullYear(),
        commissionRate: commissionRate,
        baseAmount: subtotal,
        commissionAmount,
        status: 'pending'
      });
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('school', 'name code')
      .populate('student', 'name rollNumber class')
      .populate('items.product', 'name sku');

    res.status(201).json({
      success: true,
      data: populatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, discount, paymentStatus, paymentMethod, notes } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Paid invoices cannot be edited' });
    }

    // Update items if provided
    if (items && items.length > 0) {
      // First restore stock for old items
      for (const oldItem of invoice.items) {
        await Product.findByIdAndUpdate(oldItem.product, { $inc: { stock: oldItem.quantity } });
      }

      let subtotal = 0;
      let gstAmount = 0;
      const processedItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({ success: false, message: `Product ${item.product} not found` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        }

        const itemSubtotal = item.quantity * product.basePrice;
        const itemGst = (itemSubtotal * product.gstRate) / 100;
        const itemTotal = itemSubtotal + itemGst;

        processedItems.push({
          product: item.product,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.basePrice,
          gstRate: product.gstRate,
          gstAmount: itemGst,
          totalPrice: itemTotal
        });

        subtotal += itemSubtotal;
        gstAmount += itemGst;
        product.stock -= item.quantity;
        await product.save();
      }

      invoice.items = processedItems;
      invoice.subtotal = subtotal;
      invoice.gstAmount = gstAmount;
      invoice.discount = discount !== undefined ? discount : invoice.discount;
      invoice.totalAmount = subtotal + gstAmount - invoice.discount;

      // Recalculate commission if school exists
      if (invoice.school) {
        invoice.commissionAmount = (subtotal * invoice.commissionRate) / 100;
        // Also update Commission record if it exists
        await Commission.findOneAndUpdate(
          { invoice: invoice._id },
          {
            baseAmount: subtotal,
            commissionAmount: invoice.commissionAmount
          }
        );
      }
    } else if (discount !== undefined) {
      invoice.discount = discount;
      invoice.totalAmount = (invoice.subtotal + invoice.gstAmount) - discount;
    }

    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (notes) invoice.notes = notes;

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('school', 'name code')
      .populate('student', 'name rollNumber class')
      .populate('items.product', 'name sku');

    res.status(200).json({ success: true, data: populatedInvoice });
  } catch (error) {
    next(error);
  }
};

export const generateInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('school', 'name code address contact')
      .populate('student', 'name rollNumber class section');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();

    if (invoice.isGstInvoice && invoice.businessInfo) {
      doc.fontSize(10).text(invoice.businessInfo.trade_name || invoice.businessInfo.legal_name, { align: 'left' });
      doc.text(invoice.businessInfo.address, { align: 'left' });
      doc.text(`GSTIN: ${invoice.businessInfo.gstin}`, { align: 'left' });
      doc.moveDown();
    }

    doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`School: ${invoice.school.name}`);
    doc.text(`School Code: ${invoice.school.code}`);
    doc.moveDown();

    doc.text(`Student Name: ${invoice.student.name}`);
    doc.text(`Roll Number: ${invoice.student.rollNumber}`);
    doc.text(`Class: ${invoice.student.class}${invoice.student.section ? ` - ${invoice.student.section}` : ''}`);
    doc.moveDown();

    doc.fontSize(14).text('Items:', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 300;
    const priceX = 370;
    const amountX = 450;

    doc.fontSize(10);
    doc.text('Product', itemCodeX, tableTop);
    doc.text('Qty', quantityX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Amount', amountX, tableTop);

    let yPosition = tableTop + 20;

    invoice.items.forEach((item) => {
      doc.text(item.productName, itemCodeX, yPosition);
      doc.text(item.quantity.toString(), quantityX, yPosition);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, priceX, yPosition);
      doc.text(`₹${item.totalPrice.toFixed(2)}`, amountX, yPosition);
      yPosition += 20;
    });

    doc.moveDown(2);
    doc.fontSize(12);
    doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`GST: ₹${invoice.gstAmount.toFixed(2)}`, { align: 'right' });
    doc.fontSize(14);
    doc.text(`Total Amount: ₹${invoice.totalAmount.toFixed(2)}`, { align: 'right', underline: true });

    doc.moveDown(2);
    doc.fontSize(10);
    doc.text(`Payment Method: ${invoice.paymentMethod.toUpperCase()}`);
    doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`);

    doc.end();
  } catch (error) {
    next(error);
  }
};

export const searchStudent = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const queryObj = {
      $or: [
        { rollNumber: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    };

    if (req.admin && req.admin.role !== 'superadmin') {
      queryObj.createdBy = req.admin._id;
    }

    const students = await Student.find(queryObj)
      .populate('school', 'name code commissionRate')
      .limit(10);

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

export const lookupGst = async (req, res, next) => {
  try {
    const { gstin } = req.params;
    if (!gstin) {
      return res.status(400).json({ success: false, message: 'GSTIN is required' });
    }

    const result = await lookupGstin(gstin);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
