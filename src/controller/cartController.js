import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const addToCart = async (req, res) => {
  try {