import { Request, Response } from 'express';
import { getIO, driverSockets, userSockets } from '../sockets/socketManager';

// Lets a callee decline an in-app voice call without ever opening the app —
// used by the Decline action on the background full-screen incoming-call
// notification, which only has plain HTTP available (no live socket in a
// background isolate). Best-effort, same as the socket call_reject handler:
// if the caller isn't connected there's nothing more to notify.
export const declineCall = async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { toId, toRole } = req.body as { toId?: string; toRole?: 'driver' | 'passenger' };
    if (!callId || !toId || !toRole) {
      return res.status(400).json({ message: 'callId, toId and toRole are required' });
    }
    const targetSocketId = toRole === 'driver' ? driverSockets.get(toId) : userSockets.get(toId);
    if (targetSocketId) {
      getIO().to(targetSocketId).emit('call_reject', { callId, toId, toRole, reason: 'declined' });
    }
    res.json({ message: 'Call declined' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
