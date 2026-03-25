import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  await db.insert(schema.skills).values({
    name: 'Obstacle Avoidance v2.1',
    category: 'NAVIGATION',
    description: 'Real-time obstacle detection and path re-routing using LiDAR + depth camera fusion.',
    longDescription: 'This skill provides robust obstacle avoidance for mobile robots in dynamic environments. It fuses LiDAR point clouds with depth camera data to build a 3D occupancy grid, then runs a modified A* planner at 20Hz to re-route around detected obstacles in real time. Tested on ROS2 Humble with Spot and UR5 platforms.',
    price: '3.50',
    devAddress: '0xdemo0000000000000000000000000000000000001',
    devUsername: 'robodev_ko',
    version: '2.1.0',
    compatibleDevices: ['ROS2 Humble', 'Boston Dynamics Spot', 'UR5'],
    tags: ['lidar', 'depth-camera', 'navigation', 'obstacle-avoidance'],
    appstoreUrl: 'https://origin-systems.vercel.app/#apps',
    rating: '4.8',
    reviews: 42,
    downloads: 312,
  }).onConflictDoNothing();

  await db.insert(schema.bounties).values({
    title: 'Warehouse Inventory Scanner',
    description: 'We need a robot skill that autonomously navigates warehouse aisles, scans shelf barcodes using a camera, and logs inventory counts to a JSON output. Must work with ROS2 and handle dynamic obstacles (forklifts, people).',
    amount: '2500',
    manufacturerAddress: '0xdemo0000000000000000000000000000000000002',
    manufacturerName: 'RoboArm Labs',
    status: 'OPEN',
    timeoutDays: 30,
    requiredCategory: 'NAVIGATION',
  }).onConflictDoNothing();

  console.log('Seed complete.');
}

seed().catch(console.error);
