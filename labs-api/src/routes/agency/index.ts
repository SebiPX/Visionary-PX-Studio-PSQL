import { Router } from 'express';
import clientRoutes from './clients';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import timeEntryRoutes from './timeEntries';
import storageRoutes from './storage';

const router = Router();

router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/time-entries', timeEntryRoutes);
router.use('/storage', storageRoutes);

export default router;
