-- Reset PostgreSQL Database Script
-- Run this to drop all existing tables before running migrations

-- Drop all tables in correct order (reverse of dependencies)
DROP TABLE IF EXISTS "breaks" CASCADE;
DROP TABLE IF EXISTS "leaves" CASCADE;
DROP TABLE IF EXISTS "work_entries" CASCADE;
DROP TABLE IF EXISTS "job_orders" CASCADE;
DROP TABLE IF EXISTS "operations" CASCADE;
DROP TABLE IF EXISTS "production_levels" CASCADE;
DROP TABLE IF EXISTS "processes" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;
DROP TABLE IF EXISTS "SequelizeMeta" CASCADE;

-- Drop all ENUM types that might have been created
DROP TYPE IF EXISTS "enum_employees_role" CASCADE;
DROP TYPE IF EXISTS "enum_employees_status" CASCADE;
DROP TYPE IF EXISTS "enum_products_status" CASCADE;
DROP TYPE IF EXISTS "enum_processes_stage" CASCADE;
DROP TYPE IF EXISTS "enum_processes_status" CASCADE;
DROP TYPE IF EXISTS "enum_production_levels_status" CASCADE;
DROP TYPE IF EXISTS "enum_operations_status" CASCADE;
DROP TYPE IF EXISTS "enum_job_orders_status" CASCADE;
DROP TYPE IF EXISTS "enum_job_orders_priority" CASCADE;
DROP TYPE IF EXISTS "enum_work_entries_status" CASCADE;
DROP TYPE IF EXISTS "enum_leaves_leave_type" CASCADE;
DROP TYPE IF EXISTS "enum_leaves_status" CASCADE;

-- Verify all tables are dropped
\dt
