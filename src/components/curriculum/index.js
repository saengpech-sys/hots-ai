/**
 * 📚 Curriculum Components - Barrel Export
 * 
 * Centralized export for curriculum designer step components
 * 
 * Architecture:
 * - Main components (StepCourseSelect, StepUnits, CourseDescription) for existing integration
 * - Step components in /steps for modular refactoring
 */

// Main components (existing)
export { default as StepCourseSelect } from './StepCourseSelect.vue'
export { default as StepUnits } from './StepUnits.vue'
export { default as CourseDescription } from './CourseDescription.vue'

// Modular step components (new)
export { default as Step1CourseSelection } from './steps/Step1_CourseSelection.vue'
export { default as Step2StructureDesign } from './steps/Step2_StructureDesign.vue'
export { default as Step3UnitDetail } from './steps/Step3_UnitDetail.vue'
export { default as Step4LessonPlanning } from './steps/Step4_LessonPlanning.vue'
export { default as Step5Materials } from './steps/Step5_Materials.vue'
