import { Router } from 'express';
import {
  accessOrCreateChat,
  getMyChats,
  getChatById,
  createGroupChat,
  updateGroupChat,
  addToGroup,
  removeFromGroup,
  deleteOrLeaveChat,
} from '../controllers/chat.controller';
import { protect } from '../middleware/auth.middleware';
import { avatarUpload } from '../middleware/upload.middleware';

const router = Router();

router.use(protect);

router.post('/', accessOrCreateChat);
router.get('/', getMyChats);
router.get('/:chatId', getChatById);
router.delete('/:chatId', deleteOrLeaveChat);

router.post('/group', createGroupChat);
router.put('/group/:chatId', avatarUpload.single('avatar'), updateGroupChat);
router.put('/group/:chatId/add', addToGroup);
router.delete('/group/:chatId/remove/:userId', removeFromGroup);

export default router;
