import express from "express";
import {
  getAllCategories,
  getAllIngredients,
  getAllPizzaList,
  getAllToppings,
  getPizzabyCategory,
  getPizzaById,
} from "../consumerController/getPizza.js";
import { getComboById } from "../adminController/comboOffers.js";

const router = express.Router();

router.get("/getPizzabyCategory", getPizzabyCategory);
router.get("/getPizzaById/:id", getPizzaById);
router.get("/getAllCategories", getAllCategories);
router.get("/getAllToppings", getAllToppings);
router.get("/getAllIngredients", getAllIngredients);
router.get("/getAllPizzaList", getAllPizzaList);

// Combo Offers
router.get("/getComboById/:id", getComboById);

export default router;
