const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  const client = new MongoClient('mongodb://admin:password123@localhost:27017/?authSource=admin');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Create tenant
    const tenantDb = client.db('hrm_tenants');
    const tenantCollection = tenantDb.collection('tenants');

    // Check if system tenant exists
    let tenant = await tenantCollection.findOne({ slug: 'system' });

    if (!tenant) {
      const result = await tenantCollection.insertOne({
        name: 'System',
        slug: 'system',
        status: 'active',
        settings: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          currency: 'USD',
          language: 'en',
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: '09:00', end: '18:00' },
          leavePolicy: {
            casualLeaves: 12,
            sickLeaves: 12,
            annualLeaves: 15,
            maternityLeaves: 90,
            paternityLeaves: 10,
            carryForward: true,
            maxCarryForward: 5
          },
          attendanceSettings: {
            allowRemoteCheckIn: true,
            requireGeolocation: false,
            allowFlexibleHours: false,
            graceTimeMins: 15,
            halfDayHours: 4,
            fullDayHours: 8
          }
        },
        subscription: {
          plan: 'enterprise',
          maxEmployees: 10000,
          maxAdmins: 100,
          features: ['*'],
          startDate: new Date(),
          billingCycle: 'yearly',
          amount: 0,
          currency: 'USD'
        },
        billing: {
          companyName: 'System',
          address: '',
          email: 'admin@hrm.com'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      tenant = { _id: result.insertedId };
      console.log('Created system tenant:', tenant._id);
    } else {
      console.log('System tenant already exists:', tenant._id);
    }

    // Create super admin user
    const authDb = client.db('hrm_auth');
    const userCollection = authDb.collection('users');

    // Check if super admin exists
    const existingAdmin = await userCollection.findOne({ email: 'admin@hrm.com' });

    if (existingAdmin) {
      console.log('Super admin already exists');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await userCollection.insertOne({
        tenantId: tenant._id,
        email: 'admin@hrm.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        permissions: ['*'],
        isActive: true,
        refreshTokens: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created super admin user');
    }

    console.log('\n========================================');
    console.log('Super Admin Credentials:');
    console.log('========================================');
    console.log('Email:    admin@hrm.com');
    console.log('Password: admin123');
    console.log('========================================');
    console.log('\nLogin at: http://localhost:5175/login');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createSuperAdmin();
