import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  roomId: string;
  userId: string;
  targetUserId?: string;
  signal: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private rooms: Map<string, Set<string>> = new Map();
  private userSocketMap: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove user from all rooms and notify other participants
    for (const [roomId, participants] of this.rooms.entries()) {
      if (participants.has(client.id)) {
        participants.delete(client.id);
        client.to(roomId).emit('participant-left', { userId: client.id });
        
        if (participants.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    // Remove from user socket map
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId, userName } = data;
    
    // Leave any previous room
    for (const [existingRoomId, participants] of this.rooms.entries()) {
      if (participants.has(client.id)) {
        participants.delete(client.id);
        client.leave(existingRoomId);
      }
    }

    // Join new room
    client.join(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    const room = this.rooms.get(roomId)!;
    room.add(client.id);
    this.userSocketMap.set(userId, client.id);

    // Notify other participants
    client.to(roomId).emit('participant-joined', {
      userId,
      userName,
      socketId: client.id,
    });

    // Send current participants to the new user
    const participants = Array.from(room).filter(id => id !== client.id);
    client.emit('room-participants', { participants });

    console.log(`User ${userName} joined room ${roomId}`);
  }

  @SubscribeMessage('webrtc-signal')
  handleWebRTCSignal(
    @MessageBody() data: WebRTCSignal,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, targetUserId, signal, type } = data;
    
    if (targetUserId) {
      // Send to specific user
      const targetSocketId = this.userSocketMap.get(targetUserId);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('webrtc-signal', {
          type,
          userId: data.userId,
          signal,
        });
      }
    } else {
      // Broadcast to room (for ICE candidates, etc.)
      client.to(roomId).emit('webrtc-signal', {
        type,
        userId: data.userId,
        signal,
      });
    }

    console.log(`WebRTC signal (${type}) from ${data.userId} in room ${roomId}`);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, userId } = data;
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(client.id);
      client.leave(roomId);
      
      // Notify other participants
      client.to(roomId).emit('participant-left', { userId });
      
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    this.userSocketMap.delete(userId);
    console.log(`User ${userId} left room ${roomId}`);
  }
}