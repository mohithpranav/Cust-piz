import express from "express";
import {
  getPizzabyCategory,
  getPizzaById,
} from "../consumerController/pizzaController.js";

const router = express.Router();

router.get("/getPizzabyCategory", getPizzabyCategory);
router.get("/getPizzaById/:id", getPizzaById);

export default router;
