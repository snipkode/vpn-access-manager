/**
 * Set Admin Password Script
 * Run with: node scripts/set-admin-password.js
 */

import { User } from '../models/index.js';
import { hashPassword } from '../services/auth-mysql.js';

async function setAdminPassword() {
  console.log('🔑 Set Admin Password\n');
  
  const email = 'admin@example.com';
  const password = 'Admin123!';
  
  try {
    // Find admin user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ Admin user not found! Creating...');
      
      const hashedPassword = await hashPassword(password);
      
      await User.create({
        id: `admin-${Date.now()}`,
        email,
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
        vpn_enabled: true,
        subscription_status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('✅ Admin user created with password');
    } else {
      console.log('✅ Admin user found, updating password...');
      
      const hashedPassword = await hashPassword(password);
      
      await user.update({
        password: hashedPassword,
        updated_at: new Date()
      });
      
      console.log('✅ Password updated successfully');
    }
    
    console.log('\n📝 Admin credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setAdminPassword();
