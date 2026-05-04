import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import uploadRouter from "./upload";
import urlAnalysisRouter from "./urlAnalysis";
import analysisRouter from "./analysis";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(urlAnalysisRouter);
router.use(sessionsRouter);
router.use(analysisRouter);
router.use(dashboardRouter);

export default router;
