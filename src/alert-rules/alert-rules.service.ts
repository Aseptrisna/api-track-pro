import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AlertRule } from './schemas/alert-rule.schema';
import { UpsertAlertRuleDto } from './dto/upsert-alert-rule.dto';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class AlertRulesService {
  constructor(
    @InjectModel(AlertRule.name) private alertRuleModel: Model<AlertRule>,
    private readonly vehiclesService: VehiclesService,
  ) {}

  /** Create or update a rule for one vehicle (one rule per vehicle). */
  async upsert(ownerId: string, vehicleId: string, dto: UpsertAlertRuleDto): Promise<AlertRule> {
    const update: any = { ...dto };

    // Convert geofence id strings to ObjectIds
    if (Array.isArray(dto.monitored_geofences)) {
      update.monitored_geofences = dto.monitored_geofences
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
    }

    return this.alertRuleModel.findOneAndUpdate(
      {
        owner:   new Types.ObjectId(ownerId),
        vehicle: new Types.ObjectId(vehicleId),
      },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  /** Return all vehicles for this owner merged with their alert rule (or null if default). */
  async findAllByOwner(ownerId: string) {
    const [vehicles, rules] = await Promise.all([
      this.vehiclesService.getAllByOwner(ownerId),
      this.alertRuleModel
        .find({ owner: new Types.ObjectId(ownerId) })
        .populate('monitored_geofences', 'name type')
        .lean(),
    ]);

    const ruleMap = new Map(rules.map((r) => [r.vehicle.toString(), r]));

    return (vehicles as any[]).map((v) => ({
      vehicle_id:          v._id,
      vehicle_name:        v.vehicle_name,
      plate_number:        v.plate_number,
      vehicle_speed_limit: v.speed_limit ?? 80,
      rule: ruleMap.get(v._id.toString()) ?? null,
    }));
  }

  /**
   * Internal: fetch the rule for a vehicle without owner check.
   * Returns null if no rule has been saved (caller should use defaults).
   */
  async findByVehicleId(vehicleId: string): Promise<AlertRule | null> {
    return this.alertRuleModel
      .findOne({ vehicle: new Types.ObjectId(vehicleId) })
      .lean() as any;
  }
}
