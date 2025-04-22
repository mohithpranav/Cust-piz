import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const getPizzabyCategory = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const checkCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });
    if (!checkCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const pizzas = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      include: {
        pizzas: true,
      },
    });
    return res
      .status(200)
      .json({ message: "Pizzas fetched successfully", data: pizzas });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPizzaById = async (req, res) => {
  try {
    const { id } = req.params;
    const pizza = await prisma.pizza.findUnique({
      where: {
        id: id,
      },
    });
    if (!pizza) {
      return res.status(404).json({ message: "Pizza not found" });
    }
    return res
      .status(200)
      .json({ message: "Pizza fetched successfully", data: pizza });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export { getPizzabyCategory, getPizzaById };
