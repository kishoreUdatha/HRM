import { Router } from 'express';
import * as controller from '../controllers/assetController';

const router = Router();

// Assets
router.post('/:tenantId/assets', controller.createAsset);
router.get('/:tenantId/assets', controller.getAssets);
router.get('/:tenantId/assets/:id', controller.getAssetById);
router.put('/:tenantId/assets/:id', controller.updateAsset);
router.post('/:tenantId/assets/:id/assign', controller.assignAsset);
router.post('/:tenantId/assets/:id/return', controller.returnAsset);
router.post('/:tenantId/assets/:id/maintenance', controller.addMaintenance);
router.get('/:tenantId/assets/employee/:employeeId', controller.getEmployeeAssets);

// Asset Requests
router.post('/:tenantId/requests', controller.createAssetRequest);
router.get('/:tenantId/requests', controller.getAssetRequests);
router.post('/:tenantId/requests/:id/approve', controller.approveAssetRequest);
router.post('/:tenantId/requests/:id/fulfill', controller.fulfillAssetRequest);

// Stats
router.get('/:tenantId/stats', controller.getAssetStats);

export default router;
