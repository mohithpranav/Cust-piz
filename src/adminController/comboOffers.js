import { PrismaClient } from "@prisma/client";
import { deleteFile } from "../middleware/upload.js";
import { calculateComboPrice } from "../utils/calculateComboPrice.js";

const prisma = new PrismaClient();

// Add Combo Offer
export const addComboOffer = async (req, res) => {
  try {
    const { name, description, discount, pizzas } = req.body;
    const imageUrl = req.file ? req.file.filename : "dummy.png";

    if (!imageUrl) {
      return res.status(400).json({ error: "Image is required" });
    }

    // Parse the pizzas string if it's a string
    const parsedPizzas =
      typeof pizzas === "string" ? JSON.parse(pizzas) : pizzas;

    if (!Array.isArray(parsedPizzas)) {
      return res.status(400).json({ error: "Pizzas must be an array" });
    }

    // Validate each pizza has required fields
    for (const pizza of parsedPizzas) {
      if (!pizza.pizzaId || !pizza.quantity || !pizza.size) {
        return res.status(400).json({
          error: "Each pizza must have pizzaId, quantity, and size",
        });
      }
    }

    const finalPrice = await calculateComboPrice(parsedPizzas, discount);

    const combo = await prisma.$transaction(async (tx) => {
      const newCombo = await tx.comboOffers.create({
        data: {
          name,
          description,
          discount,
          price: finalPrice,
          imageUrl,
        },
      });

      const comboPizzas = parsedPizzas.map((pizza) => ({
        comboId: newCombo.id,
        pizzaId: pizza.pizzaId,
        quantity: pizza.quantity,
        size: pizza.size,
      }));

      await tx.comboPizza.createMany({ data: comboPizzas });

      return {
        ...newCombo,
        imageUrl: `/uploads/${newCombo.imageUrl}`,
      };
    });

    res.status(201).json({ message: "Combo Offer Added", combo });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);
    console.error("Error in addComboOffer:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get Combo Offers
export const getComboOffer = async (req, res) => {
  try {
    const combos = await prisma.comboOffers.findMany({
      include: {
        pizzas: {
          include: {
            pizza: true,
          },
        },
      },
    });

    const combosWithPrice = await Promise.all(
      combos.map(async (combo) => {
        const pizzas = combo.pizzas.map((item) => ({
          pizzaId: item.pizza.id,
          size: item.size,
          quantity: item.quantity,
        }));

        const finalPrice = await calculateComboPrice(pizzas, combo.discount);

        return {
          ...combo,
          price: finalPrice,
          imageUrl: `/uploads/${combo.imageUrl}`,
        };
      })
    );

    res.status(200).json(combosWithPrice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Edit Combo Offer
export const editComboOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, discount, pizzas } = req.body;
    const imageUrl = req.file ? req.file.filename : null;

    const existingCombo = await prisma.comboOffers.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCombo) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(404).json({ error: "Combo Offer not found" });
    }

    if (imageUrl && existingCombo.imageUrl !== "dummy.png") {
      deleteFile(existingCombo.imageUrl);
    }

    const finalPrice = await calculateComboPrice(pizzas, discount);

    const updatedCombo = await prisma.$transaction(async (tx) => {
      await tx.comboOffers.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          discount,
          price: finalPrice,
          imageUrl: imageUrl || existingCombo.imageUrl,
        },
      });

      await tx.comboPizza.deleteMany({
        where: { comboId: Number(id) },
      });

      const comboPizzas = pizzas.map((pizza) => ({
        comboId: Number(id),
        pizzaId: pizza.pizzaId,
        quantity: pizza.quantity,
        size: pizza.size,
      }));

      await tx.comboPizza.createMany({ data: comboPizzas });

      return {
        id: Number(id),
        name,
        description,
        discount,
        price: finalPrice,
        imageUrl: `/uploads/${imageUrl || existingCombo.imageUrl}`,
        pizzas,
      };
    });

    res.status(200).json({ message: "Combo Offer Updated", updatedCombo });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);
    res.status(400).json({ error: error.message });
  }
};

export const deleteComboOffer = async (req, res) => {
  try {
    const { comboId } = req.body;

    if (!comboId) {
      return res.status(400).json({ error: "comboId is required" });
    }

    const existingCombo = await prisma.comboOffers.findUnique({
      where: { id: comboId }, // No Number()
    });

    if (!existingCombo) {
      return res.status(404).json({ error: "Combo Offer not found" });
    }

    if (existingCombo.imageUrl !== "dummy.png") {
      deleteFile(existingCombo.imageUrl);
    }

    await prisma.$transaction(async (tx) => {
      await tx.comboPizza.deleteMany({
        where: { comboId },
      });

      await tx.comboOffers.delete({
        where: { id: comboId },
      });
    });

    res.status(200).json({ message: "Combo Offer Deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
