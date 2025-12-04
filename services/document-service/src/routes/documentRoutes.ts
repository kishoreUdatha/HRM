import { Router } from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Document Routes
router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/expiring', documentController.getExpiringDocuments);
router.get('/:documentId', documentController.getDocument);
router.get('/:documentId/download', documentController.getDownloadUrl);
router.get('/:documentId/audit', documentController.getAuditTrail);
router.post('/:documentId/version', upload.single('file'), documentController.uploadVersion);
router.post('/:documentId/sign', documentController.signDocument);
router.post('/:documentId/share', documentController.shareDocument);
router.delete('/:documentId', documentController.deleteDocument);

// Template Routes
router.post('/templates', documentController.createTemplate);
router.get('/templates', documentController.getTemplates);
router.get('/templates/:templateId', documentController.getTemplate);

export default router;
