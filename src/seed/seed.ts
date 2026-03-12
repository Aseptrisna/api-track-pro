import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// ─── Schemas (inline untuk standalone script) ───────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'admin' },
    phone: String,
    isEmailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

const VehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Types.ObjectId, ref: 'User' },
    vehicle_name: String,
    vehicle_type: String,
    plate_number: { type: String, unique: true },
    brand: String,
    model: String,
    year: Number,
    status: { type: String, default: 'active' },
    device_id: { type: mongoose.Types.ObjectId, ref: 'Device' },
    driver: { type: mongoose.Types.ObjectId, ref: 'Driver' },
  },
  { timestamps: true, versionKey: false },
);

const DeviceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
    imei: { type: String, unique: true },
    device_name: String,
    vehicle_id: { type: mongoose.Types.ObjectId, ref: 'Vehicle' },
    phone_number: String,
    status: { type: String, default: 'offline' },
    last_seen: Date,
  },
  { timestamps: true, versionKey: false },
);

const GpsDataSchema = new mongoose.Schema(
  {
    imei: { type: String, index: true },
    vehicle_id: { type: mongoose.Types.ObjectId, ref: 'Vehicle' },
    latitude: Number,
    longitude: Number,
    speed: { type: Number, default: 0 },
    course: { type: Number, default: 0 },
    altitude: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    raw_data: Object,
  },
  { timestamps: true, versionKey: false, collection: 'gps_data' },
);
GpsDataSchema.index({ imei: 1, timestamp: -1 });

// ─── Models ─────────────────────────────────────────────────────────────────

const User = mongoose.model('User', UserSchema);
const Vehicle = mongoose.model('Vehicle', VehicleSchema);
const Device = mongoose.model('Device', DeviceSchema);
const GpsData = mongoose.model('GpsData', GpsDataSchema);

// ─── Data Kendaraan ─────────────────────────────────────────────────────────

const vehiclesData = [
  {
    vehicle_name: 'Truk Pengiriman 01',
    vehicle_type: 'truck',
    plate_number: 'B 1234 TRK',
    brand: 'Mitsubishi',
    model: 'Colt Diesel FE 74',
    year: 2023,
  },
  {
    vehicle_name: 'Mobil Operasional 01',
    vehicle_type: 'car',
    plate_number: 'B 5678 OPS',
    brand: 'Toyota',
    model: 'Avanza',
    year: 2024,
  },
  {
    vehicle_name: 'Motor Kurir 01',
    vehicle_type: 'motorcycle',
    plate_number: 'B 9012 KRR',
    brand: 'Honda',
    model: 'Vario 160',
    year: 2024,
  },
  {
    vehicle_name: 'Bus Karyawan 01',
    vehicle_type: 'bus',
    plate_number: 'B 3456 BUS',
    brand: 'Mercedes-Benz',
    model: 'OH 1526',
    year: 2022,
  },
  {
    vehicle_name: 'Pickup Delivery 01',
    vehicle_type: 'delivery_vehicle',
    plate_number: 'B 7890 DLV',
    brand: 'Suzuki',
    model: 'New Carry',
    year: 2024,
  },
];

const devicesData = [
  { imei: '860000000000001', device_name: 'GT06-TRK01', phone_number: '081200000001' },
  { imei: '860000000000002', device_name: 'GT06-OPS01', phone_number: '081200000002' },
  { imei: '860000000000003', device_name: 'GT06-KRR01', phone_number: '081200000003' },
  { imei: '860000000000004', device_name: 'GT06-BUS01', phone_number: '081200000004' },
  { imei: '860000000000005', device_name: 'GT06-DLV01', phone_number: '081200000005' },
];

// ─── Rute Bandung (waypoints per kendaraan) ─────────────────────────────────
// Setiap rute = array [lat, lng] yang akan diinterpolasi

const routes: [number, number][][] = [
  // Rute 1: Truk — Gedebage → Cibiru → Ujungberung → Cicaheum → Antapani
  [
    [-6.9402, 107.6928], [-6.9350, 107.7050], [-6.9280, 107.7150],
    [-6.9200, 107.7100], [-6.9120, 107.6980], [-6.9050, 107.6850],
    [-6.9000, 107.6700], [-6.9050, 107.6550], [-6.9120, 107.6450],
    [-6.9200, 107.6380], [-6.9280, 107.6350], [-6.9350, 107.6400],
    [-6.9400, 107.6500], [-6.9420, 107.6600], [-6.9410, 107.6750],
    [-6.9402, 107.6928],
  ],
  // Rute 2: Mobil — Dago → Lembang → Setiabudi → Pasteur
  [
    [-6.8850, 107.6135], [-6.8750, 107.6170], [-6.8600, 107.6200],
    [-6.8450, 107.6180], [-6.8300, 107.6150], [-6.8200, 107.6100],
    [-6.8300, 107.6050], [-6.8450, 107.6000], [-6.8600, 107.5980],
    [-6.8750, 107.5950], [-6.8850, 107.5920], [-6.8900, 107.5980],
    [-6.8920, 107.6050], [-6.8880, 107.6100], [-6.8850, 107.6135],
  ],
  // Rute 3: Motor — Braga → Asia Afrika → Sudirman → Buah Batu
  [
    [-6.9175, 107.6095], [-6.9210, 107.6080], [-6.9250, 107.6100],
    [-6.9300, 107.6150], [-6.9350, 107.6200], [-6.9400, 107.6250],
    [-6.9450, 107.6300], [-6.9500, 107.6350], [-6.9520, 107.6400],
    [-6.9480, 107.6350], [-6.9420, 107.6280], [-6.9350, 107.6200],
    [-6.9280, 107.6150], [-6.9220, 107.6110], [-6.9175, 107.6095],
  ],
  // Rute 4: Bus — Cimahi → Baros → Leuwi Panjang → Kopo → Soreang
  [
    [-6.8720, 107.5420], [-6.8800, 107.5500], [-6.8900, 107.5580],
    [-6.9000, 107.5650], [-6.9150, 107.5700], [-6.9300, 107.5780],
    [-6.9450, 107.5850], [-6.9550, 107.5900], [-6.9650, 107.5950],
    [-6.9750, 107.6000], [-6.9650, 107.5950], [-6.9450, 107.5850],
    [-6.9200, 107.5720], [-6.9000, 107.5600], [-6.8720, 107.5420],
  ],
  // Rute 5: Pickup — Kiaracondong → Batununggal → Margacinta → Buah Batu
  [
    [-6.9250, 107.6400], [-6.9300, 107.6350], [-6.9350, 107.6300],
    [-6.9400, 107.6350], [-6.9450, 107.6420], [-6.9500, 107.6480],
    [-6.9520, 107.6550], [-6.9480, 107.6620], [-6.9420, 107.6680],
    [-6.9350, 107.6700], [-6.9280, 107.6650], [-6.9230, 107.6580],
    [-6.9210, 107.6500], [-6.9230, 107.6440], [-6.9250, 107.6400],
  ],
];

// ─── Helper: interpolasi titik antar waypoints ──────────────────────────────

function interpolateRoute(
  waypoints: [number, number][],
  totalPoints: number,
): { lat: number; lng: number; course: number }[] {
  const result: { lat: number; lng: number; course: number }[] = [];

  // Hitung total jarak
  let totalDist = 0;
  const segDists: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = haversine(waypoints[i], waypoints[i + 1]);
    segDists.push(d);
    totalDist += d;
  }

  // Distribusi titik proporsional ke setiap segmen
  let pointsUsed = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const segPoints =
      i === waypoints.length - 2
        ? totalPoints - pointsUsed
        : Math.max(1, Math.round((segDists[i] / totalDist) * totalPoints));

    for (let j = 0; j < segPoints; j++) {
      const t = j / segPoints;
      const lat = waypoints[i][0] + t * (waypoints[i + 1][0] - waypoints[i][0]);
      const lng = waypoints[i][1] + t * (waypoints[i + 1][1] - waypoints[i][1]);
      const course = bearing(waypoints[i], waypoints[i + 1]);
      result.push({ lat: roundCoord(lat), lng: roundCoord(lng), course: Math.round(course) });
    }
    pointsUsed += segPoints;
  }

  return result;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearing(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function roundCoord(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleet_monitoring';
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected!\n');

  // 1. Cleanup existing demo data
  console.log('🧹 Cleaning existing demo data...');
  const existingUser = await User.findOne({ email: 'demo@trackpro.id' });
  if (existingUser) {
    const existingVehicles = await Vehicle.find({ owner: existingUser._id });
    const vehicleIds = existingVehicles.map((v) => v._id);
    await GpsData.deleteMany({ vehicle_id: { $in: vehicleIds } });
    await Device.deleteMany({ vehicle_id: { $in: vehicleIds } });
    await Vehicle.deleteMany({ owner: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
    console.log('   ✓ Old demo data removed');
  }

  // 2. Create User
  console.log('\n👤 Creating demo user...');
  const hashedPassword = await bcrypt.hash('demo123456', 10);
  const user = await User.create({
    name: 'Demo Admin',
    email: 'demo@trackpro.id',
    password: hashedPassword,
    role: 'admin',
    phone: '081200000000',
    isEmailVerified: true,
    isActive: true,
  });
  console.log(`   ✓ User created: ${user.email}`);

  // 3. Create Vehicles & Devices
  console.log('\n🚗 Creating vehicles & devices...');
  const createdVehicles: mongoose.Document[] = [];
  const createdDevices: mongoose.Document[] = [];

  for (let i = 0; i < vehiclesData.length; i++) {
    const vehicle = await Vehicle.create({
      ...vehiclesData[i],
      owner: user._id,
    });

    const device = await Device.create({
      ...devicesData[i],
      vehicle_id: vehicle._id,
      owner: user._id,
      status: 'online',
      last_seen: new Date(),
    });

    // Link device ke vehicle
    await Vehicle.updateOne({ _id: vehicle._id }, { device_id: device._id });

    createdVehicles.push(vehicle);
    createdDevices.push(device);
    console.log(`   ✓ ${vehiclesData[i].vehicle_name} | ${devicesData[i].imei} | ${vehiclesData[i].plate_number}`);
  }

  // 4. Generate GPS History (24 jam terakhir, setiap 30 detik = ~2880 titik per kendaraan)
  console.log('\n📍 Generating GPS history (24 hours, every 30s)...');
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const intervalMs = 30 * 1000; // 30 detik
  const totalPoints = Math.floor((24 * 60 * 60 * 1000) / intervalMs); // ~2880

  let totalGpsRecords = 0;

  for (let i = 0; i < createdVehicles.length; i++) {
    const vehicle = createdVehicles[i];
    const device = createdDevices[i];
    const route = interpolateRoute(routes[i], totalPoints);
    const imei = devicesData[i].imei;

    const gpsBatch: any[] = [];

    for (let j = 0; j < totalPoints; j++) {
      const pointIndex = j % route.length;
      const point = route[pointIndex];
      const timestamp = new Date(oneDayAgo.getTime() + j * intervalMs);

      // Simulasi speed: bervariasi 20-80 km/h, kadang berhenti (simulasi lampu merah/istirahat)
      let speed = 30 + Math.random() * 50;
      // Setiap ~10 menit, ada kemungkinan berhenti
      if (j % 20 === 0 && Math.random() < 0.3) speed = 0;
      // Jam 00:00-05:00 kendaraan parkir
      const hour = timestamp.getHours();
      if (hour >= 0 && hour < 5) speed = 0;

      // Tambah sedikit noise ke koordinat agar terlihat natural
      const noiseLat = (Math.random() - 0.5) * 0.0002;
      const noiseLng = (Math.random() - 0.5) * 0.0002;

      gpsBatch.push({
        imei,
        vehicle_id: vehicle._id,
        latitude: roundCoord(point.lat + noiseLat),
        longitude: roundCoord(point.lng + noiseLng),
        speed: Math.round(speed * 10) / 10,
        course: point.course,
        altitude: 650 + Math.random() * 50, // Bandung ~ 650-700m
        timestamp,
      });
    }

    // Bulk insert dalam batch 500
    for (let b = 0; b < gpsBatch.length; b += 500) {
      await GpsData.insertMany(gpsBatch.slice(b, b + 500));
    }

    totalGpsRecords += gpsBatch.length;
    console.log(`   ✓ ${vehiclesData[i].vehicle_name}: ${gpsBatch.length} GPS records`);
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(55));
  console.log('  ✅ SEED COMPLETE');
  console.log('═'.repeat(55));
  console.log(`  👤 User    : demo@trackpro.id / demo123456`);
  console.log(`  🚗 Vehicles: ${createdVehicles.length}`);
  console.log(`  📡 Devices : ${createdDevices.length}`);
  console.log(`  📍 GPS Data: ${totalGpsRecords} records (24h history)`);
  console.log('═'.repeat(55));

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
