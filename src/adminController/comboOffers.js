import { PrismaClient } from "@prisma/client";
import { deleteFile, renameFileToMatchId } from "../utils/fileUtils.js";
import { calculateComboPrice } from "../utils/calculateComboPrice.js";

const prisma = new PrismaClient();

// Add Combo Offer
export const addComboOffer = async (req, res) => {
  try {
    const { name, description, discount, pizzas } = req.body;
    const tempImageUrl = req.file ? req.file.filename : "dummy.png";

    if (!tempImageUrl) {
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
          imageUrl: tempImageUrl,
        },
      });

      // Rename the file to match the combo ID
      const newImageUrl = renameFileToMatchId(
        tempImageUrl,
        newCombo.id,
        "combo"
      );

      // Update the combo with the new image URL if renaming was successful
      if (newImageUrl) {
        await tx.comboOffers.update({
          where: { id: newCombo.id },
          data: { imageUrl: newImageUrl },
        });
        newCombo.imageUrl = newImageUrl;
      }

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
    const tempImageUrl = req.file ? req.file.filename : null;

    const existingCombo = await prisma.comboOffers.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCombo) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(404).json({ error: "Combo Offer not found" });
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

    const updatedCombo = await prisma.$transaction(async (tx) => {
      // If a new image was uploaded, delete the old one
      if (tempImageUrl && existingCombo.imageUrl !== "dummy.png") {
        deleteFile(existingCombo.imageUrl);
      }

      // Update the combo with the new data
      const combo = await tx.comboOffers.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          discount,
          price: finalPrice,
          imageUrl: tempImageUrl || existingCombo.imageUrl,
        },
      });

      // If a new image was uploaded, rename it to match the combo ID
      if (tempImageUrl) {
        const newImageUrl = renameFileToMatchId(
          tempImageUrl,
          combo.id,
          "combo"
        );

        // Update the combo with the new image URL if renaming was successful
        if (newImageUrl) {
          await tx.comboOffers.update({
            where: { id: combo.id },
            data: { imageUrl: newImageUrl },
          });
          combo.imageUrl = newImageUrl;
        }
      }

      // Delete existing combo pizzas
      await tx.comboPizza.deleteMany({
        where: { comboId: Number(id) },
      });

      // Create new combo pizzas
      const comboPizzas = parsedPizzas.map((pizza) => ({
        comboId: Number(id),
        pizzaId: pizza.pizzaId,
        quantity: pizza.quantity,
        size: pizza.size,
      }));

      await tx.comboPizza.createMany({ data: comboPizzas });

      return {
        ...combo,
        imageUrl: `/uploads/${combo.imageUrl}`,
        pizzas: parsedPizzas,
      };
    });

    res.status(200).json({ message: "Combo Offer Updated", updatedCombo });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);
    console.error("Error in editComboOffer:", error);
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
      where: { id: comboId },
    });

    if (!existingCombo) {
      return res.status(404).json({ error: "Combo Offer not found" });
    }

    // Delete the image file if it's not the default
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
    console.error("Error in deleteComboOffer:", error);
    res.status(400).json({ error: error.message });
  }
};
