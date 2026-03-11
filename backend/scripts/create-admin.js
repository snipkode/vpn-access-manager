/**
 * Create Admin User Script
 * Run with: node scripts/create-admin.js
 */

import { User } from './models/index.js';
import { hashPassword } from './services/auth-mysql.js';

async function createAdmin() {
  console.log('👤 Create Admin User\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  try {
    const email = await question('Admin email: ');
    const password = await question('Admin password: ');
    const name = await question('Admin name (optional): ') || 'Admin';

    if (!email || !password) {
      console.log('❌ Email and password are required');
      process.exit(1);
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('⚠️ User already exists, updating...');
      
      const hashedPassword = await hashPassword(password);
      await User.update(
        { 
          password: hashedPassword,
          role: 'admin',
          name,
          updated_at: new Date()
        },
        { where: { email } }
      );
      
      console.log('✅ Admin user updated successfully');
    } else {
      const hashedPassword = await hashPassword(password);
      
      await User.create({
        id: `admin-${Date.now()}`,
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        vpn_enabled: true,
        subscription_status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('✅ Admin user created successfully');
    }

    console.log('\n📝 Admin credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Change the password after first login!');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

createAdmin();
