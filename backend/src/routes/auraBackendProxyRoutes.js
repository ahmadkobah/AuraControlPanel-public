import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const router = express.Router();
const AURA_BACKEND_BASE = 'http://localhost:8000';

// Define schemas for direct MongoDB access
let Company, User, Department;

try {
  Company = mongoose.model('Company');
} catch {
  const companySchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    address: String,
    tier: String,
    isDeleted: { type: Boolean, default: false }
  }, { collection: 'companies' });
  Company = mongoose.model('Company', companySchema);
}

try {
  User = mongoose.model('User');
} catch {
  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    role: String,
    companyId: mongoose.Schema.Types.ObjectId,
    departmentId: mongoose.Schema.Types.ObjectId,
    status: String,
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  }, { collection: 'users' });
  User = mongoose.model('User', userSchema);
}

try {
  Department = mongoose.model('Department');
} catch {
  const departmentSchema = new mongoose.Schema({
    name: String,
    companyId: mongoose.Schema.Types.ObjectId,
    description: String,
    status: String,
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    createdAt: Date
  }, { collection: 'departments' });
  Department = mongoose.model('Department', departmentSchema);
}

// ============ USER MANAGEMENT (Direct MongoDB Access) ============
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ 
      isDeleted: { $ne: true },
      isArchived: { $ne: true }
    })
    .select('firstName lastName email role companyId departmentId status createdAt')
    .lean();
    
    return res.json({ users, data: users });
  } catch (err) {
    console.error('Users fetch error:', err);
    return res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch users from database'
    });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id,
      isDeleted: { $ne: true }
    })
    .select('firstName lastName email role companyId departmentId status createdAt')
    .lean();
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const userData = { ...req.body };
    
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const user = await User.create(userData);
    const userObj = user.toObject();
    delete userObj.password; // Don't return password
    
    return res.status(201).json(userObj);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Hash password if provided
    if (updates.password && updates.password.trim()) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password; // Don't update if not provided
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ============ DEPARTMENT MANAGEMENT (Direct MongoDB Access) ============
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find({ 
      isDeleted: { $ne: true },
      isArchived: { $ne: true }
    })
    .select('name companyId description status createdAt')
    .lean();
    
    return res.json({ departments, data: departments });
  } catch (err) {
    console.error('Departments fetch error:', err);
    return res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch departments from database'
    });
  }
});

router.get('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findOne({ 
      _id: req.params.id,
      isDeleted: { $ne: true }
    })
    .select('name companyId description status createdAt')
    .lean();
    
    if (!department) return res.status(404).json({ error: 'Department not found' });
    return res.json(department);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const department = await Department.create({
      ...req.body,
      createdAt: new Date()
    });
    return res.status(201).json(department);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!department) return res.status(404).json({ error: 'Department not found' });
    return res.json(department);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    
    if (!department) return res.status(404).json({ error: 'Department not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ============ COMPANY MANAGEMENT (Direct MongoDB Access) ============
router.get('/companies', async (req, res) => {
  try {
    const companies = await Company.find({ isDeleted: { $ne: true } })
      .select('name email phone address tier')
      .lean();
    
    return res.json({ companies, data: companies });
  } catch (err) {
    console.error('Companies fetch error:', err);
    return res.status(500).json({ 
      error: err.message,
      message: 'Failed to fetch companies from database'
    });
  }
});

router.get('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findOne({ 
      _id: req.params.id,
      isDeleted: { $ne: true }
    }).lean();
    
    if (!company) return res.status(404).json({ error: 'Company not found' });
    return res.json(company);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/companies', async (req, res) => {
  try {
    const company = await Company.create(req.body);
    return res.status(201).json(company);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!company) return res.status(404).json({ error: 'Company not found' });
    return res.json(company);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    
    if (!company) return res.status(404).json({ error: 'Company not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
