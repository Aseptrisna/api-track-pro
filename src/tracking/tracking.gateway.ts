import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GpsDataService } from '../gps-data/gps-data.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private gpsDataService: GpsDataService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_vehicle')
  handleSubscribeVehicle(client: Socket, vehicleId: string) {
    client.join(`vehicle_${vehicleId}`);
    return { event: 'subscribed', data: vehicleId };
  }

  @SubscribeMessage('unsubscribe_vehicle')
  handleUnsubscribeVehicle(client: Socket, vehicleId: string) {
    client.leave(`vehicle_${vehicleId}`);
    return { event: 'unsubscribed', data: vehicleId };
  }

  @SubscribeMessage('subscribe_all')
  handleSubscribeAll(client: Socket) {
    client.join('all_vehicles');
    return { event: 'subscribed', data: 'all' };
  }

  emitLocationUpdate(data: any) {
    this.server.to('all_vehicles').emit('location_update', data);
    if (data.vehicle_id) {
      this.server.to(`vehicle_${data.vehicle_id}`).emit('vehicle_location', data);
    }
  }

  emitAlert(data: any) {
    this.server.emit('alert', data);
  }
}
