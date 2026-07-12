import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import uploadRouter from "./upload";
import urlAnalysisRouter from "./urlAnalysis";
import analysisRouter from "./analysis";
import dashboardRouter from "./dashboard";
import usersRouter from "./users.js";
import adminRouter from "./admin.js";
import teamsRouter from "./teams.js";
import enterpriseRouter from "./enterprise.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(uploadRouter);
router.use(urlAnalysisRouter);
router.use(sessionsRouter);
router.use(analysisRouter);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(adminRouter);
router.use(teamsRouter);
router.use(enterpriseRouter);

export default router;
