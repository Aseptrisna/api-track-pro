import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Geofence } from './schemas/geofence.schema';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';

@Injectable()
export class GeofenceService {
  constructor(@InjectModel(Geofence.name) private geofenceModel: Model<Geofence>) {}

  async create(dto: CreateGeofenceDto): Promise<Geofence> { return this.geofenceModel.create(dto); }

  async findAll(): Promise<Geofence[]> { return this.geofenceModel.find().exec(); }

  async findById(id: string): Promise<Geofence> {
    const g = await this.geofenceModel.findById(id);
    if (!g) throw new NotFoundException('Geofence not found');
    return g;
  }

  async update(id: string, dto: UpdateGeofenceDto): Promise<Geofence> {
    const g = await this.geofenceModel.findByIdAndUpdate(id, dto, { new: true });
    if (!g) throw new NotFoundException('Geofence not found');
    return g;
  }

  async remove(id: string): Promise<void> {
    const r = await this.geofenceModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException('Geofence not found');
  }

  isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
