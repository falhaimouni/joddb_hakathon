# Database Seeders

This directory contains seed files to populate the database with initial data.

## Available Seeders

### 1. Departments (`20250101000001-seed-departments.js`)
Seeds the following departments:
- management
- production
- testing
- qa

### 2. Products (`20250101000002-seed-products.js`)
Seeds sample products with serial numbers:
- PRD-001: Product Alpha
- PRD-002: Product Beta
- PRD-003: Product Gamma
- PRD-004: Product Delta
- PRD-005: Product Epsilon

### 3. Operations (`20250101000003-seed-operations.js`)
Seeds operations for each department:

**Management (3 operations):**
- Project Planning
- Resource Allocation
- Quality Review

**Production (5 operations):**
- Assembly
- Welding
- Packaging
- Labeling
- Material Preparation

**Testing (4 operations):**
- Functional Testing
- Stress Testing
- Performance Testing
- Unit Testing

**QA (4 operations):**
- Final Inspection
- Documentation Review
- Compliance Check
- Safety Verification

## Usage

### Run all seeders
```bash
npm run seed
```

### Undo all seeders
```bash
npm run seed:undo
```

### Run specific seeder
```bash
npm run seed:specific 20250101000001-seed-departments.js
```

### Run individual seeder with sequelize-cli
```bash
npx sequelize-cli db:seed --seed 20250101000001-seed-departments.js
```

## Order Matters

Make sure to run seeders in the correct order due to foreign key dependencies:
1. Departments (must run first - no dependencies)
2. Products (independent of other seeders)
3. Operations (depends on Departments)

All seeders are named with timestamps to ensure proper execution order.

