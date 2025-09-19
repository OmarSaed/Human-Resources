import { Router } from 'express';

export function createFolderRoutes(services: any): Router {
  const router = Router();
  
  // TODO: Implement folder routes
  router.get('/', (req, res) => {
    res.json({ message: 'Folder routes not implemented yet' });
  });
  
  return router;
}
