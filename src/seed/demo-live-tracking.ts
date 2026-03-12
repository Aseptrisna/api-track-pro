import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// ─── Konfigurasi ────────────────────────────────────────────────────────────

const API_URL = process.env.API_BASE_URL || 'http://localhost:8032';
const INTERVAL_MS = 3000; // Update setiap 3 detik
const GPS_ENDPOINT = `${API_URL}/gps-data`;

// ─── Data Device ────────────────────────────────────────────────────────────

const devices = [
  { imei: '860000000000001', name: 'Truk Pengiriman 01' },
  { imei: '860000000000002', name: 'Mobil Operasional 01' },
  { imei: '860000000000003', name: 'Motor Kurir 01' },
  { imei: '860000000000004', name: 'Bus Karyawan 01' },
  { imei: '860000000000005', name: 'Pickup Delivery 01' },
];

// ─── Rute Bandung (waypoints per kendaraan) ─────────────────────────────────

const routes: [number, number][][] = [
  // Rute 1: Truk — Gedebage → Cibiru → Ujungberung → Cicaheum
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
  // Rute 4: Bus — Cimahi → Baros → Leuwi Panjang → Kopo
  [
    [-6.8720, 107.5420], [-6.8800, 107.5500], [-6.8900, 107.5580],
    [-6.9000, 107.5650], [-6.9150, 107.5700], [-6.9300, 107.5780],
    [-6.9450, 107.5850], [-6.9550, 107.5900], [-6.9650, 107.5950],
    [-6.9750, 107.6000], [-6.9650, 107.5950], [-6.9450, 107.5850],
    [-6.9200, 107.5720], [-6.9000, 107.5600], [-6.8720, 107.5420],
  ],
  // Rute 5: Pickup — Kiaracondong → Batununggal → Margacinta
  [
    [-6.9250, 107.6400], [-6.9300, 107.6350], [-6.9350, 107.6300],
    [-6.9400, 107.6350], [-6.9450, 107.6420], [-6.9500, 107.6480],
    [-6.9520, 107.6550], [-6.9480, 107.6620], [-6.9420, 107.6680],
    [-6.9350, 107.6700], [-6.9280, 107.6650], [-6.9230, 107.6580],
    [-6.9210, 107.6500], [-6.9230, 107.6440], [-6.9250, 107.6400],
  ],
];

// ─── Helper functions ───────────────────────────────────────────────────────

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

function interpolatePair(
  a: [number, number],
  b: [number, number],
  t: number,
): { lat: number; lng: number; course: number } {
  return {
    lat: Math.round((a[0] + t * (b[0] - a[0])) * 1000000) / 1000000,
    lng: Math.round((a[1] + t * (b[1] - a[1])) * 1000000) / 1000000,
    course: Math.round(bearing(a, b)),
  };
}

// ─── State per kendaraan ────────────────────────────────────────────────────

interface VehicleState {
  imei: string;
  name: string;
  routeIndex: number; // index waypoint saat ini
  progress: number; // 0.0 - 1.0 progress antara 2 waypoint
  speed: number; // km/h
  isStopped: boolean;
  stopTicks: number; // sisa ticks berhenti
}

const states: VehicleState[] = devices.map((d, i) => ({
  imei: d.imei,
  name: d.name,
  routeIndex: Math.floor(Math.random() * routes[i].length), // start di posisi random
  progress: 0,
  speed: 30 + Math.random() * 30,
  isStopped: false,
  stopTicks: 0,
}));

// ─── Update posisi kendaraan ────────────────────────────────────────────────

function updateState(state: VehicleState, routeIdx: number): void {
  const route = routes[routeIdx];

  // Apakah sedang berhenti?
  if (state.isStopped) {
    state.stopTicks--;
    if (state.stopTicks <= 0) {
      state.isStopped = false;
      state.speed = 20 + Math.random() * 40;
    }
    return;
  }

  // Random chance berhenti (simulasi lampu merah, macet, dll)
  if (Math.random() < 0.05) {
    state.isStopped = true;
    state.stopTicks = 2 + Math.floor(Math.random() * 5); // berhenti 6-21 detik
    state.speed = 0;
    return;
  }

  // Variasi kecepatan
  state.speed += (Math.random() - 0.5) * 10;
  state.speed = Math.max(15, Math.min(80, state.speed));

  // Hitung jarak yang ditempuh dalam 3 detik (km)
  const distanceKm = (state.speed * (INTERVAL_MS / 1000)) / 3600;

  // Estimasi jarak antar waypoint (~0.5-2 km), progressnya sekitar 0.01-0.1 per tick
  const progressStep = distanceKm / 1.0; // approximate segment length 1km
  state.progress += progressStep;

  if (state.progress >= 1.0) {
    state.progress = 0;
    state.routeIndex = (state.routeIndex + 1) % route.length;
    // Wrap around ke 0 jika sudah di akhir
    if (state.routeIndex >= route.length - 1) {
      state.routeIndex = 0;
    }
  }
}

function getPosition(state: VehicleState, routeIdx: number) {
  const route = routes[routeIdx];
  const from = route[state.routeIndex];
  const to = route[(state.routeIndex + 1) % route.length];

  const pos = interpolatePair(from, to, Math.min(state.progress, 1));

  // Tambah noise kecil
  pos.lat += (Math.random() - 0.5) * 0.00005;
  pos.lng += (Math.random() - 0.5) * 0.00005;

  return pos;
}

// ─── Send GPS Data ──────────────────────────────────────────────────────────

async function sendGpsData(state: VehicleState, routeIdx: number): Promise<void> {
  const pos = getPosition(state, routeIdx);

  const payload = {
    imei: state.imei,
    latitude: pos.lat,
    longitude: pos.lng,
    speed: Math.round(state.speed * 10) / 10,
    course: pos.course,
    altitude: 650 + Math.random() * 50,
  };

  try {
    const response = await fetch(GPS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`  ❌ ${state.name}: HTTP ${response.status}`);
    }
  } catch (err: any) {
    console.error(`  ❌ ${state.name}: ${err.message}`);
  }
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

let tickCount = 0;

async function tick() {
  tickCount++;
  const timestamp = new Date().toLocaleTimeString('id-ID');

  console.log(`\n⏱  Tick #${tickCount} | ${timestamp}`);
  console.log('─'.repeat(60));

  const promises = states.map(async (state, i) => {
    updateState(state, i);
    const pos = getPosition(state, i);
    const status = state.isStopped ? '🔴 STOP' : '🟢 MOVE';
    console.log(
      `  ${status} ${state.name.padEnd(22)} | ` +
        `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} | ` +
        `${state.speed.toFixed(0).padStart(3)} km/h | ` +
        `${pos.course}°`,
    );
    await sendGpsData(state, i);
  });

  await Promise.all(promises);
}

// ─── Start ──────────────────────────────────────────────────────────────────

console.log('═'.repeat(60));
console.log('  🚀 TrackPro Live Demo Simulator');
console.log('═'.repeat(60));
console.log(`  📡 Endpoint : ${GPS_ENDPOINT}`);
console.log(`  🚗 Vehicles : ${devices.length}`);
console.log(`  ⏱  Interval : ${INTERVAL_MS / 1000}s`);
console.log(`  📍 Area     : Bandung, Jawa Barat`);
console.log('═'.repeat(60));
console.log('\n  Press Ctrl+C to stop\n');

// Run first tick immediately, then setInterval
tick();
setInterval(tick, INTERVAL_MS);
