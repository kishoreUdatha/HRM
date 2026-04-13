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

async function updateSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('SuperAdmin@123', 12);

    // Delete existing super admin and create new one
    await User.deleteMany({ role: 'super_admin' });

    const superAdmin = await User.create({
      email: 'admin@hrm-saas.com',
      password: hashedPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
    });

    console.log('Super admin updated successfully:');
    console.log('  Email: admin@hrm-saas.com');
    console.log('  Password: SuperAdmin@123');
    console.log('  ID:', superAdmin._id);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error updating super admin:', error);
    process.exit(1);
  }
}

updateSuperAdmin();
