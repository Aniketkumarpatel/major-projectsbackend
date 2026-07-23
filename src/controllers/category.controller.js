'use strict';

const getAllCategories = async (_req, res) => {
  res.status(501).json({ success: false, message: 'getAllCategories – not implemented' });
};
const getCategoryById = async (_req, res) => {
  res.status(501).json({ success: false, message: 'getCategoryById – not implemented' });
};
const createCategory = async (_req, res) => {
  res.status(501).json({ success: false, message: 'createCategory – not implemented' });
};
const updateCategory = async (_req, res) => {
  res.status(501).json({ success: false, message: 'updateCategory – not implemented' });
};
const deleteCategory = async (_req, res) => {
  res.status(501).json({ success: false, message: 'deleteCategory – not implemented' });
};

module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
