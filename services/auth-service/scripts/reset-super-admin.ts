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

async function resetSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find and update super admin
    const hashedPassword = await bcrypt.hash('SuperAdmin@123', 12);

    const superAdmin = await User.findOneAndUpdate(
      { role: 'super_admin' },
      {
        password: hashedPassword,
        isActive: true
      },
      { new: true }
    );

    if (superAdmin) {
      console.log('Super admin password reset successfully:');
      console.log('  Email:', superAdmin.email);
      console.log('  Password: SuperAdmin@123');
    } else {
      console.log('No super admin found');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting super admin:', error);
    process.exit(1);
  }
}

resetSuperAdmin();
