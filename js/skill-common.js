function saveSkillChanges(updatedSkill) {
  const skills = loadSkills();
  const index = skills.findIndex(skill => skill.id === updatedSkill.id);

  if (index >= 0) {
    skills[index] = normalizeSkill(updatedSkill);
  } else {
    skills.unshift(normalizeSkill(updatedSkill));
  }

  saveSkills(skills);
  return skills;
}