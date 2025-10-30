require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('./config/config.json')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
  logging: console.log
});

async function resetDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Connected successfully');

    console.log('\n🗑️  Dropping all tables...');
    
    // Drop all tables in reverse order of dependencies
    const tables = [
      'breaks',
      'leaves',
      'work_entries',
      'job_orders',
      'operations',
      'production_levels',
      'processes',
      'products',
      'employees',
      'SequelizeMeta'
    ];

    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`  ✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`  ⚠ Could not drop ${table}: ${error.message}`);
      }
    }

    console.log('\n🗑️  Dropping all ENUM types...');
    
    const enumTypes = [
      'enum_employees_role',
      'enum_employees_status',
      'enum_products_status',
      'enum_processes_stage',
      'enum_processes_status',
      'enum_production_levels_status',
      'enum_operations_status',
      'enum_job_orders_status',
      'enum_job_orders_priority',
      'enum_work_entries_status',
      'enum_leaves_leave_type',
      'enum_leaves_status'
    ];

    for (const enumType of enumTypes) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`);
        console.log(`  ✓ Dropped ENUM: ${enumType}`);
      } catch (error) {
        console.log(`  ⚠ Could not drop ${enumType}: ${error.message}`);
      }
    }

    console.log('\n✅ Database reset complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run migrate');
    console.log('   2. Run: npm start');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();

