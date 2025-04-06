import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const addComboOffer = async (req, res) => {
  try {
    const { name, description, imageUrl, discount, pizzas } = req.body;

    const combo = await prisma.$transaction(async (tx) => {
      // Validate all pizzas exist
      for (const pizza of pizzas) {
        const existingPizza = await tx.pizza.findUnique({
          where: {
            id: pizza.pizzaId,
          },
        });

        if (!existingPizza) {
          throw new Error(`Pizza with id ${pizza.pizzaId} does not exist`);
        }
      }

      // Create the combo offer
      const newCombo = await tx.comboOffers.create({
        data: { name, description, imageUrl, discount },
      });

      // Create combo-pizza relationships
      const comboPizzas = pizzas.map((pizza) => ({
        comboId: newCombo.id,
        pizzaId: pizza.pizzaId,
        quantity: pizza.quantity,
        size: pizza.size,
      }));

      await tx.comboPizza.createMany({ data: comboPizzas });

      return newCombo;
    });

    res.status(201).json({ message: "Combo offer added successfully", combo });
  } catch (error) {
    console.error("Error adding combo offer:", error);
    res.status(400).json({ error: error.message || "Internal server error" });
  }
};

const getComboOffer = async (req, res) => {
  try {
    const combos = await prisma.comboOffers.findMany({
      include: {
        pizzas: {
          include: {
            pizza: true, // This gives pizza data with sizes
          },
        },
      },
    });

    const combosWithPrice = combos.map((combo) => {
      let totalPrice = 0;

      combo.pizzas.forEach((item) => {
        const sizePrice = item.pizza.sizes[item.size.toUpperCase()]; // e.g., sizes["LARGE"]
        totalPrice += sizePrice * item.quantity;
      });

      const discountAmount = (totalPrice * combo.discount) / 100;
      const finalPrice = totalPrice - discountAmount;

      return {
        ...combo,
        totalPrice,
        discountAmount,
        finalPrice,
      };
    });

    res.status(200).json(combosWithPrice);
  } catch (error) {
    console.error("Error fetching combo offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteComboOffer = async (req, res) => {
  try {
    const { comboId } = req.body;
    const checkCombo = await prisma.comboOffers.findUnique({
      where: {
        id: comboId,
      },
    });

    if (!checkCombo) {
      return res.status(404).json({ message: "Combo not found" });
    }

    const deleteCombo = await prisma.comboOffers.delete({
      where: {
        id: comboId,
      },
    });
    return res
      .status(200)
      .json({ message: "Combo deleted successfully", data: deleteCombo });
  } catch (error) {
    console.error("Error deleting combo offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const editComboOffer = async (req, res) => {
  try {
    const { comboId, name, description, imageUrl, discount, pizzas } = req.body;

    const updatedCombo = await prisma.$transaction(async (tx) => {
      // Check Combo exists
      const existingCombo = await tx.comboOffers.findUnique({
        where: { id: comboId },
      });

      if (!existingCombo) {
        throw new Error("Combo not found");
      }

      // Update combo offer details
      const combo = await tx.comboOffers.update({
        where: { id: comboId },
        data: { name, description, imageUrl, discount },
      });

      // Delete old comboPizza records
      await tx.comboPizza.deleteMany({
        where: { comboId },
      });

      // Validate pizzas exist
      for (const pizza of pizzas) {
        const checkPizza = await tx.pizza.findUnique({
          where: { id: pizza.pizzaId },
        });

        if (!checkPizza) {
          throw new Error(`Pizza not found with ID: ${pizza.pizzaId}`);
        }
      }

      // Add new comboPizza records
      const comboPizzas = pizzas.map((pizza) => ({
        comboId,
        pizzaId: pizza.pizzaId,
        quantity: pizza.quantity,
        size: pizza.size,
      }));

      await tx.comboPizza.createMany({ data: comboPizzas });

      return combo;
    });

    res.status(200).json({
      message: "Combo offer updated successfully",
      combo: updatedCombo,
    });
  } catch (error) {
    console.error("Error editing combo offer:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export { addComboOffer, getComboOffer, deleteComboOffer, editComboOffer };
