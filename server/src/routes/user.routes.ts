import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateProfile,
  getOnlineUsers,
} from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { avatarUpload } from '../middleware/upload.middleware';

const router = Router();

router.use(protect);

router.get('/', getAllUsers);
router.get('/online', getOnlineUsers);
router.get('/:id', getUserById);
router.put('/profile', avatarUpload.single('avatar'), updateProfile);

export default router;
