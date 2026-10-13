import "server-only";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";

const MAX_ITEMS = 200;

export const listProducts = (q?: string) =>
  prisma.product.findMany({
    where: { active: true, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 100,
  });

export const listShoppingItems = (userId: string) =>
  prisma.shoppingListItem.findMany({ where: { userId }, orderBy: [{ done: "asc" }, { createdAt: "desc" }], include: { product: true } });

export async function addShoppingItem(userId: string, input: { text?: string; productId?: string; quantity?: number }) {
  const count = await prisma.shoppingListItem.count({ where: { userId } });
  if (count >= MAX_ITEMS) throw new AppError("LIMIT_REACHED", "Lista zakupów może mieć maksymalnie 200 pozycji.");
  let text = input.text?.trim() ?? "";
  if (input.productId) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw notFound("Produkt");
    text = product.name;
  }
  if (!text) throw new AppError("VALIDATION_ERROR", "Wpisz nazwę produktu.");
  return prisma.shoppingListItem.create({ data: { userId, text, productId: input.productId, quantity: input.quantity ?? 1 } });
}

export async function updateShoppingItem(userId: string, id: string, data: { done?: boolean; quantity?: number }) {
  const r = await prisma.shoppingListItem.updateMany({ where: { id, userId }, data });
  if (r.count === 0) throw notFound("Pozycja listy");
}

export async function deleteShoppingItem(userId: string, id: string) {
  const r = await prisma.shoppingListItem.deleteMany({ where: { id, userId } });
  if (r.count === 0) throw notFound("Pozycja listy");
}

export const clearDoneItems = (userId: string) => prisma.shoppingListItem.deleteMany({ where: { userId, done: true } });

export const listFavorites = (userId: string) =>
  prisma.favoriteProduct.findMany({ where: { userId }, include: { product: true }, orderBy: { createdAt: "desc" } });

export async function setFavorite(userId: string, productId: string, favorite: boolean) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound("Produkt");
  if (favorite) {
    await prisma.favoriteProduct.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: {} });
  } else {
    await prisma.favoriteProduct.deleteMany({ where: { userId, productId } });
  }
}
