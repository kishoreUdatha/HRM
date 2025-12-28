import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:hrm_password_2024@localhost:27017/hrm_auth?authSource=admin';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'hr', 'manager', 'employee'], default: 'employee' },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Super admin already exists:', existingAdmin.email);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    const superAdmin = await User.create({
      email: 'admin@hrm.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
    });

    console.log('Super admin created successfully:');
    console.log('  Email: admin@hrm.com');
    console.log('  Password: Admin@123');
    console.log('  ID:', superAdmin._id);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
