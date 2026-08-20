export default {
  findAllCalendars: jest.fn(() => Promise.resolve([])),
  findEventsInRange: jest.fn(() => Promise.resolve([])),
  findEventById: jest.fn(() => Promise.resolve(null)),
  createEvent: jest.fn(() => Promise.resolve(true)),
  createEventAsync: jest.fn(() => Promise.resolve('event-id')),
  createCalendar: jest.fn(() => Promise.resolve('calendar-id')),
  saveEvent: jest.fn(() => Promise.resolve(true)),
  removeEvent: jest.fn(() => Promise.resolve(true)),
  removeCalendar: jest.fn(() => Promise.resolve(true)),
  authorizationStatus: jest.fn(() => Promise.resolve('authorized')),
  requestAuthorization: jest.fn(() => Promise.resolve('authorized')),
};
