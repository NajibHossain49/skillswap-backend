import { Router } from 'express';
import { skillController } from './skill.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createSkillSchema, updateSkillSchema, skillQuerySchema } from './skill.schema';

const router = Router();

/**
 * @route   GET /api/skills/categories
 * @desc    Get all skill categories
 * @access  Public
 */
router.get('/categories', skillController.getCategories.bind(skillController));

/**
 * @route   GET /api/skills
 * @desc    Get all skills
 * @access  Public
 */
router.get(
  '/',
  validateQuery(skillQuerySchema),
  skillController.getAllSkills.bind(skillController),
);

/**
 * @route   GET /api/skills/:id
 * @desc    Get skill by ID
 * @access  Public
 */
router.get('/:id', skillController.getSkillById.bind(skillController));

/**
 * @route   POST /api/skills
 * @desc    Create a new skill (Mentor or Admin)
 * @access  Mentor, Admin
 */
router.post(
  '/',
  authenticate,
  authorize('MENTOR', 'ADMIN'),
  validate(createSkillSchema),
  skillController.createSkill.bind(skillController),
);

/**
 * @route   PATCH /api/skills/:id
 * @desc    Update skill (owner Mentor or Admin)
 * @access  Mentor, Admin
 */
router.patch(
  '/:id',
  authenticate,
  authorize('MENTOR', 'ADMIN'),
  validate(updateSkillSchema),
  skillController.updateSkill.bind(skillController),
);

/**
 * @route   DELETE /api/skills/:id
 * @desc    Delete skill (owner Mentor or Admin)
 * @access  Mentor, Admin
 */
router.delete(
  '/:id',
  authenticate,
  authorize('MENTOR', 'ADMIN'),
  skillController.deleteSkill.bind(skillController),
);

export default router;
