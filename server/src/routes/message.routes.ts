import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  deleteMessage,
  editMessage,
} from '../controllers/message.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(protect);

router.post('/', upload.single('file'), sendMessage);
router.get('/:chatId', getMessages);
router.delete('/:messageId', deleteMessage);
router.put('/:messageId/edit', editMessage);

export default router;
