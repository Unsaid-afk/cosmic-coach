import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import uploadRouter from "./upload";
import urlAnalysisRouter from "./urlAnalysis";
import analysisRouter from "./analysis";
import dashboardRouter from "./dashboard";
import usersRouter from "./users.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(urlAnalysisRouter);
router.use(sessionsRouter);
router.use(analysisRouter);
router.use(dashboardRouter);
router.use(usersRouter);

export default router;
