/**
 * Shared soft-delete filter. Spread this into the `where` of every user, skill
 * and session query so soft-deleted rows (deletedAt set) never leak into reads
 * or become the target of a write.
 *
 *   prisma.user.findMany({ where: { ...notDeleted, role: 'MENTOR' } })
 *   prisma.skill.findUnique({ where: { id, ...notDeleted } })
 */
export const notDeleted = { deletedAt: null } as const;
