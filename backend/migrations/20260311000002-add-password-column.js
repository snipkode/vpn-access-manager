/**
 * Add password column to users table
 */

import { sequelize } from '../config/sequelize.js';

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    // Add password column
    await queryInterface.addColumn('users', 'password', {
      type: 'VARCHAR(255)',
      allowNull: true,
      comment: 'Hashed password (null for OAuth users)'
    });

    // Add last_login column
    await queryInterface.addColumn('users', 'last_login', {
      type: 'DATETIME',
      allowNull: true
    });

    console.log('✅ Added password and last_login columns to users table');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    // Continue if column already exists
    if (error.message.includes('Duplicate column')) {
      console.log('⚠️ Columns already exist, skipping...');
    } else {
      throw error;
    }
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    await queryInterface.removeColumn('users', 'password');
    await queryInterface.removeColumn('users', 'last_login');
    console.log('✅ Removed password and last_login columns');
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

export { up, down };

// Run if called directly
if (process.argv[1]?.includes('add-password-column.js')) {
  up()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
