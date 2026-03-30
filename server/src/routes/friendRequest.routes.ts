import { Router } from 'express';
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getPendingRequests,
  getFriends,
  getStatusWith,cancelRequest
} from '../controllers/friendRequest.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/send',                    sendRequest);
router.put('/:requestId/accept',        acceptRequest);
router.put('/:requestId/reject',        rejectRequest);
router.get('/pending',                  getPendingRequests);
router.get('/friends',                  getFriends);
router.get('/status/:userId',           getStatusWith);
router.delete('/:requestId/cancel', protect, cancelRequest);

export default router;