import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Room data based on the provided guest house structure
const sampleRooms = [
  // 1st Floor (Block A) - Single rooms + Gym
  ...Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `A-${i + 1}`,
    type: 'single',
    status: 'vacant',
    floor: '1',
    block: 'A',
    pricePerNight: 1500,
    facilities: ['Gym'],
    description: 'Comfortable single room with gym access on 1st floor',
    isActive: true
  })),

  // 2nd Floor (Block B) - Single rooms + Double rooms
  ...Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `B-${i + 1}`,
    type: 'single',
    status: 'vacant',
    floor: '2',
    block: 'B',
    pricePerNight: 1500,
    description: 'Spacious single room with modern amenities on 2nd floor',
    isActive: true
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    roomNumber: `B-${i + 11}`,
    type: 'double',
    status: 'vacant',
    floor: '2',
    block: 'B',
    pricePerNight: 2200,
    description: 'Comfortable double room for two guests on 2nd floor',
    isActive: true
  })),

  // 3rd Floor (Block C) - Single rooms + Double rooms
  ...Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `C-${i + 1}`,
    type: 'single',
    status: 'vacant',
    floor: '3',
    block: 'C',
    pricePerNight: 1500,
    description: 'Single room with city view on 3rd floor',
    isActive: true
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    roomNumber: `C-${i + 11}`,
    type: 'double',
    status: 'vacant',
    floor: '3',
    block: 'C',
    pricePerNight: 2200,
    description: 'Double room with balcony on 3rd floor',
    isActive: true
  })),

  // 4th Floor (Block D) - Single rooms + Double rooms
  ...Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `D-${i + 1}`,
    type: 'single',
    status: 'vacant',
    floor: '4',
    block: 'D',
    pricePerNight: 1500,
    description: 'Single room with study desk on 4th floor',
    isActive: true
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    roomNumber: `D-${i + 11}`,
    type: 'double',
    status: 'vacant',
    floor: '4',
    block: 'D',
    pricePerNight: 2200,
    description: 'Double room with extra space on 4th floor',
    isActive: true
  })),

  // 5th Floor (Block E) - Single rooms only
  ...Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `E-${i + 1}`,
    type: 'single',
    status: 'vacant',
    floor: '5',
    block: 'E',
    pricePerNight: 1500,
    description: 'Single room with mountain view on 5th floor',
    isActive: true
  })),

  // 6th Floor (Block F) - Single rooms only
  ...Array.from({ length: 10 }, (_, i) => ({
    roomNumber: `F-${i + 1}`,
    type: 'single',
    status: 'vacant',
    floor: '6',
    block: 'F',
    pricePerNight: 1500,
    description: 'Single room with garden view on 6th floor',
    isActive: true
  }))
];

// Sample admin user
const adminUser = {
  name: 'Admin User',
  email: 'admin@campusstay.com',
  password: 'Admin@123',
  phone: '9876543210',
  role: 'admin',
  isActive: true,
  address: {
    street: '123 Admin Street',
    city: 'Admin City',
    state: 'Admin State',
    zipCode: '12345',
    country: 'India'
  }
};

// Sample staff user
const staffUser = {
  name: 'Staff User',
  email: 'staff@campusstay.com',
  password: 'Staff@123',
  phone: '9876543211',
  role: 'staff',
  isActive: true,
  address: {
    street: '456 Staff Street',
    city: 'Staff City',
    state: 'Staff State',
    zipCode: '12346',
    country: 'India'
  }
};

const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Create users
    console.log('👥 Creating sample users...');
    const admin = await User.create(adminUser);
    const staff = await User.create(staffUser);
    console.log('👥 Created sample users');

    // Create rooms
    console.log('🏠 Creating rooms...');
    console.log(`📊 Creating ${sampleRooms.length} rooms...`);
    const rooms = await Room.create(sampleRooms);
    console.log('🏠 Created sample rooms');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Sample Users:');
    console.log(`Admin: ${admin.email} / ${adminUser.password}`);
    console.log(`Staff: ${staff.email} / ${staffUser.password}`);
    console.log(`\n🏠 Total Rooms Created: ${rooms.length}`);
    console.log(`\n🏢 Floor Layout:`);
    console.log(`   1st Floor (Block A): 10 single rooms + Gym`);
    console.log(`   2nd Floor (Block B): 10 single rooms + 6 double rooms`);
    console.log(`   3rd Floor (Block C): 10 single rooms + 6 double rooms`);
    console.log(`   4th Floor (Block D): 10 single rooms + 6 double rooms`);
    console.log(`   5th Floor (Block E): 10 single rooms`);
    console.log(`   6th Floor (Block F): 10 single rooms`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seeder if called directly
console.log('🔍 Seeder script loaded');

// Check if this script is being run directly
const isDirectExecution = process.argv[1].endsWith('seedData.js');

if (isDirectExecution) {
  console.log('🚀 Running seeder...');
  seedDatabase();
} else {
  console.log('⏭️  Skipping seeder (not called directly)');
}

export default seedDatabase;
