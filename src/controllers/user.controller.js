'use strict';

const getMe = async (_req, res) => {
  res.status(501).json({ success: false, message: 'getMe – not implemented' });
};
const updateMe = async (_req, res) => {
  res.status(501).json({ success: false, message: 'updateMe – not implemented' });
};
const deleteMe = async (_req, res) => {
  res.status(501).json({ success: false, message: 'deleteMe – not implemented' });
};
const getAllUsers = async (_req, res) => {
  res.status(501).json({ success: false, message: 'getAllUsers – not implemented' });
};
const getUserById = async (_req, res) => {
  res.status(501).json({ success: false, message: 'getUserById – not implemented' });
};
const updateUser = async (_req, res) => {
  res.status(501).json({ success: false, message: 'updateUser – not implemented' });
};
const deleteUser = async (_req, res) => {
  res.status(501).json({ success: false, message: 'deleteUser – not implemented' });
};

module.exports = { getMe, updateMe, deleteMe, getAllUsers, getUserById, updateUser, deleteUser };
