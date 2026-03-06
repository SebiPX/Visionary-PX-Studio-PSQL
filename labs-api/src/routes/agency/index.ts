import { Router } from 'express';
import clientRoutes from './clients';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import timeEntryRoutes from './timeEntries';
import storageRoutes from './storage';
import profileRoutes from './profiles';
import notificationRoutes from './notifications';
import assetRoutes from './assets';
import clientContactRoutes from './clientContacts';
import workloadRoutes from './workload';
import serviceModuleRoutes from './serviceModules';
import seniorityLevelRoutes from './seniorityLevels';

const router = Router();

router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/storage', storageRoutes);
router.use('/profiles', profileRoutes);
router.use('/notifications', notificationRoutes);
router.use('/assets', assetRoutes);
router.use('/client-contacts', clientContactRoutes);
router.use('/workload', workloadRoutes);
router.use('/service-modules', serviceModuleRoutes);
router.use('/seniority-levels', seniorityLevelRoutes);

export default router;
