module.exports = {
  moduleFileExtensions: ['js', 'ts', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/infrastructure/'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
};
