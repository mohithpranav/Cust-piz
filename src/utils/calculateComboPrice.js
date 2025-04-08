import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const calculateComboPrice = async (pizzas, discount) => {
  let totalPrice = 0;

  for (const pizza of pizzas) {
    if (!pizza.pizzaId) {
      throw new Error("pizzaId is missing for one of the pizzas");
    }

    const existingPizza = await prisma.pizza.findUnique({
      where: { id: pizza.pizzaId },
    });

    if (!existingPizza) {
      throw new Error(`Pizza with id ${pizza.pizzaId} does not exist`);
    }

    const sizePrice = existingPizza.sizes[pizza.size.toUpperCase()];
    totalPrice += sizePrice * pizza.quantity;
  }

  const discountAmount = (totalPrice * discount) / 100;
  const finalPrice = totalPrice - discountAmount;

  return finalPrice;
};
