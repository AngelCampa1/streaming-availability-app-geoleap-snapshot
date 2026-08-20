export default {
  getAll: jest.fn(() => Promise.resolve([])),
  getContactByPhone: jest.fn(() => Promise.resolve(null)),
  getContactById: jest.fn(() => Promise.resolve(null)),
  openContactForm: jest.fn(() => Promise.resolve({})),
  openExistingContact: jest.fn(() => Promise.resolve({})),
  addContact: jest.fn(() => Promise.resolve(true)),
  updateContact: jest.fn(() => Promise.resolve(true)),
  deleteContact: jest.fn(() => Promise.resolve(true)),
  checkPermission: jest.fn(() => Promise.resolve('authorized')),
  requestPermission: jest.fn(() => Promise.resolve('authorized')),
};
