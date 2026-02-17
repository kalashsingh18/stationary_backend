import School from '../models/School.model.js';

export const getOwnedSchoolIds = async (admin) => {
  if (!admin) return null;
  if (admin.role === 'superadmin') return null; // null means "no restriction"

  const owned = await School.find({ createdBy: admin._id }).select('_id');
  return owned.map(s => s._id);
};
