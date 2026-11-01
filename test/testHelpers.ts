export const latestMockCall = (mockClientApp: jest.Mock<any, any, any>) => {
  const [latestCall] = mockClientApp.mock.calls.slice(-1);
  return latestCall;
};
