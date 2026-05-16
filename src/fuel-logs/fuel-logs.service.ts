import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FuelLog } from './schemas/fuel-log.schema';
import { CreateFuelLogDto } from './dto/create-fuel-log.dto';
import { UpdateFuelLogDto } from './dto/update-fuel-log.dto';

@Injectable()
export class FuelLogsService {
  constructor(@InjectModel(FuelLog.name) private fuelLogModel: Model<FuelLog>) {}

  async create(dto: CreateFuelLogDto, userId: string): Promise<FuelLog> {
    return this.fuelLogModel.create({
      ...dto,
      vehicle:    new Types.ObjectId(dto.vehicle),
      created_by: new Types.ObjectId(userId),
    });
  }

  async findAll(options: {
    userId: string;
    vehicleId?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, vehicleId, page = 1, limit = 20 } = options;

    // Scope to vehicles owned by this user via lookup
    const matchStage: any = { 'vehicle_doc.owner': new Types.ObjectId(userId) };
    if (vehicleId) matchStage['vehicle'] = new Types.ObjectId(vehicleId);

    const skip = (page - 1) * limit;

    const [result] = await this.fuelLogModel.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicle_doc',
        },
      },
      { $unwind: '$vehicle_doc' },
      { $match: matchStage },
      { $sort: { date: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                vehicle: '$vehicle_doc',
                date: 1, liters: 1, cost_per_liter: 1,
                odometer_at_fill: 1, station_name: 1, notes: 1, createdAt: 1,
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const data  = result?.data  ?? [];
    const total = result?.total?.[0]?.count ?? 0;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<FuelLog> {
    const log = await this.fuelLogModel.findById(id).populate('vehicle');
    if (!log) throw new NotFoundException('Fuel log not found');
    return log;
  }

  async update(id: string, dto: UpdateFuelLogDto): Promise<FuelLog> {
    const log = await this.fuelLogModel.findByIdAndUpdate(id, dto, { new: true });
    if (!log) throw new NotFoundException('Fuel log not found');
    return log;
  }

  async remove(id: string): Promise<void> {
    const r = await this.fuelLogModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Fuel log not found');
  }

  async getStats(userId: string, vehicleId?: string) {
    const matchStage: any = { 'vehicle_doc.owner': new Types.ObjectId(userId) };
    if (vehicleId) matchStage['vehicle'] = new Types.ObjectId(vehicleId);

    // ── Monthly cost trend (last 6 months) ──────────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [summary, monthlyTrend, byVehicle] = await Promise.all([
      // Overall totals
      this.fuelLogModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalLiters:   { $sum: '$liters' },
            totalCost:     { $sum: { $multiply: ['$liters', '$cost_per_liter'] } },
            totalFills:    { $sum: 1 },
            avgCostPerL:   { $avg: '$cost_per_liter' },
          },
        },
      ]),

      // Monthly trend
      this.fuelLogModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: { ...matchStage, date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            totalLiters: { $sum: '$liters' },
            totalCost:   { $sum: { $multiply: ['$liters', '$cost_per_liter'] } },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', totalLiters: 1, totalCost: 1, _id: 0 } },
      ]),

      // By vehicle breakdown
      this.fuelLogModel.aggregate([
        { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc' } },
        { $unwind: '$vehicle_doc' },
        { $match: matchStage },
        {
          $group: {
            _id: '$vehicle',
            vehicleName:  { $first: '$vehicle_doc.vehicle_name' },
            plateNumber:  { $first: '$vehicle_doc.plate_number' },
            totalLiters:  { $sum: '$liters' },
            totalCost:    { $sum: { $multiply: ['$liters', '$cost_per_liter'] } },
            totalFills:   { $sum: 1 },
          },
        },
        { $sort: { totalCost: -1 } },
        { $limit: 10 },
        {
          $project: {
            vehicleName: 1, plateNumber: 1,
            totalLiters: 1, totalCost: 1, totalFills: 1, _id: 0,
          },
        },
      ]),
    ]);

    const s = summary[0] ?? { totalLiters: 0, totalCost: 0, totalFills: 0, avgCostPerL: 0 };

    return {
      totalLiters:   Math.round(s.totalLiters * 10) / 10,
      totalCost:     Math.round(s.totalCost),
      totalFills:    s.totalFills,
      avgCostPerL:   Math.round((s.avgCostPerL ?? 0) * 10) / 10,
      monthlyTrend,
      byVehicle,
    };
  }

  // ── Fuel Efficiency ───────────────────────────────────────────────────────────
  async getEfficiency(userId: string, vehicleId?: string) {
    const baseMatch: any = {
      'vehicle_doc.owner': new Types.ObjectId(userId),
      odometer_at_fill: { $exists: true, $ne: null, $gt: 0 },
    };
    if (vehicleId && Types.ObjectId.isValid(vehicleId)) {
      baseMatch.vehicle = new Types.ObjectId(vehicleId);
    }

    // Fetch all fill-ups with odometer, sorted by vehicle then date
    const logs = await this.fuelLogModel.aggregate([
      {
        $lookup: {
          from:         'vehicles',
          localField:   'vehicle',
          foreignField: '_id',
          as:           'vehicle_doc',
        },
      },
      { $unwind: '$vehicle_doc' },
      { $match: baseMatch },
      {
        $project: {
          vehicle:         1,
          vehicle_name:    '$vehicle_doc.vehicle_name',
          plate_number:    '$vehicle_doc.plate_number',
          date:            1,
          liters:          1,
          odometer_at_fill: 1,
          cost_per_liter:  1,
        },
      },
      { $sort: { vehicle: 1, date: 1 } },
    ]);

    // Group by vehicle and compute km/L between consecutive fills
    type FillItem = (typeof logs)[number];
    const vehicleMap = new Map<string, FillItem[]>();
    for (const log of logs) {
      const key = String(log.vehicle);
      if (!vehicleMap.has(key)) vehicleMap.set(key, []);
      vehicleMap.get(key)!.push(log);
    }

    // Anomaly threshold: efficiency deviating > 30% from vehicle average
    const ANOMALY_THRESHOLD = 0.30;

    const perVehicle: {
      vehicle_name: string;
      plate_number: string;
      avg_km_per_liter: number;
      best_km_per_liter: number;
      worst_km_per_liter: number;
      anomaly_count: number;
      fill_count: number;
      intervals: { date: Date; liters: number; km_driven: number; km_per_liter: number; is_anomaly: boolean }[];
    }[] = [];
    for (const [, fills] of vehicleMap.entries()) {
      const intervals: {
        date: Date; liters: number; km_driven: number; km_per_liter: number; is_anomaly: boolean;
      }[] = [];

      for (let i = 1; i < fills.length; i++) {
        const prev = fills[i - 1];
        const curr = fills[i];
        const km = curr.odometer_at_fill - prev.odometer_at_fill;
        if (km > 0 && km < 5000 && curr.liters > 0) {  // sanity check < 5000 km between fills
          intervals.push({
            date:         curr.date,
            liters:       curr.liters,
            km_driven:    Math.round(km),
            km_per_liter: Math.round((km / curr.liters) * 100) / 100,
            is_anomaly:   false,
          });
        }
      }

      if (intervals.length === 0) continue;

      const avg = intervals.reduce((s, e) => s + e.km_per_liter, 0) / intervals.length;

      // Flag anomalies
      for (const e of intervals) {
        if (Math.abs(e.km_per_liter - avg) / avg > ANOMALY_THRESHOLD) {
          e.is_anomaly = true;
        }
      }

      perVehicle.push({
        vehicle_name:    fills[0].vehicle_name,
        plate_number:    fills[0].plate_number,
        avg_km_per_liter: Math.round(avg * 100) / 100,
        best_km_per_liter: Math.max(...intervals.map((e) => e.km_per_liter)),
        worst_km_per_liter: Math.min(...intervals.map((e) => e.km_per_liter)),
        anomaly_count:    intervals.filter((e) => e.is_anomaly).length,
        fill_count:       intervals.length,
        intervals:        intervals.slice(-12), // last 12 fill intervals
      });
    }

    perVehicle.sort((a, b) => b.avg_km_per_liter - a.avg_km_per_liter);

    const allKmL  = perVehicle.flatMap((v) => v.intervals.map((e) => e.km_per_liter));
    const fleetAvg = allKmL.length
      ? Math.round(allKmL.reduce((s, v) => s + v, 0) / allKmL.length * 100) / 100
      : 0;

    const totalAnomalies = perVehicle.reduce((s, v) => s + v.anomaly_count, 0);

    return {
      fleetAvg,
      totalDataPoints: allKmL.length,
      totalAnomalies,
      perVehicle,
    };
  }

  // ── CO₂ Emissions ─────────────────────────────────────────────────────────────
  // 2.4 kg CO₂ per liter — Indonesian mixed fleet average (Pertalite ~2.31, Solar ~2.68)
  private readonly CO2_FACTOR = 2.4;

  async getEmissions(userId: string, vehicleId?: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const yearStart  = new Date(targetYear, 0, 1);
    const yearEnd    = new Date(targetYear + 1, 0, 1);

    const baseMatch: any = {
      'vehicle_doc.owner': new Types.ObjectId(userId),
      date: { $gte: yearStart, $lt: yearEnd },
    };
    if (vehicleId && Types.ObjectId.isValid(vehicleId)) {
      baseMatch.vehicle = new Types.ObjectId(vehicleId);
    }

    const lookup = {
      $lookup: {
        from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle_doc',
      },
    };
    const unwind = { $unwind: '$vehicle_doc' };

    const [monthly, perVehicle, totals] = await Promise.all([
      // Monthly totals
      this.fuelLogModel.aggregate([
        lookup, unwind, { $match: baseMatch },
        {
          $group: {
            _id: { $month: '$date' },
            liters: { $sum: '$liters' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Per vehicle
      this.fuelLogModel.aggregate([
        lookup, unwind, { $match: baseMatch },
        {
          $group: {
            _id:          '$vehicle',
            vehicle_name: { $first: '$vehicle_doc.vehicle_name' },
            plate_number: { $first: '$vehicle_doc.plate_number' },
            liters:       { $sum: '$liters' },
            fills:        { $sum: 1 },
          },
        },
        { $sort: { liters: -1 } },
      ]),

      // Grand total for year
      this.fuelLogModel.aggregate([
        lookup, unwind, { $match: baseMatch },
        { $group: { _id: null, liters: { $sum: '$liters' }, fills: { $sum: 1 } } },
      ]),
    ]);

    // This-month totals
    const now       = new Date();
    const monthMatch = {
      ...baseMatch,
      date: {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lt:  new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    };
    const [thisMonth] = await this.fuelLogModel.aggregate([
      lookup, unwind, { $match: monthMatch },
      { $group: { _id: null, liters: { $sum: '$liters' } } },
    ]);

    const f = this.CO2_FACTOR;
    const totalLiters   = totals[0]?.liters ?? 0;
    const totalCo2Kg    = Math.round(totalLiters * f);
    const thisMonthCo2  = Math.round((thisMonth?.liters ?? 0) * f);

    return {
      year:           targetYear,
      co2Factor:      f,
      totalLiters:    Math.round(totalLiters * 10) / 10,
      totalCo2Kg,
      totalCo2Tonnes: Math.round(totalCo2Kg / 1000 * 10) / 10,
      thisMonthCo2Kg: thisMonthCo2,
      // Carbon equivalents
      treesNeeded:    Math.ceil(totalCo2Kg / 21),       // 1 tree absorbs ~21 kg/year
      flightsJktSub:  Math.round(totalCo2Kg / 100),     // JKT→SBY ~100 kg CO₂/pax
      monthly: Array.from({ length: 12 }, (_, i) => {
        const entry = monthly.find((m: any) => m._id === i + 1);
        const l     = entry?.liters ?? 0;
        return { month: i + 1, liters: Math.round(l * 10) / 10, co2_kg: Math.round(l * f) };
      }),
      perVehicle: perVehicle.map((v: any) => ({
        vehicle_name: v.vehicle_name,
        plate_number: v.plate_number,
        liters:       Math.round(v.liters * 10) / 10,
        co2_kg:       Math.round(v.liters * f),
        fills:        v.fills,
        pct:          totalLiters > 0 ? Math.round((v.liters / totalLiters) * 100) : 0,
      })),
    };
  }
}
