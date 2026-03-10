# Testing Framework for OntoFuel NVL Visualization

## Overview
This directory contains comprehensive tests for the OntoFuel NVL visualization application using Jest and React Testing Library.

## Test Files

### Configuration Files
- **jest.config.js** - Jest configuration with jsdom environment
- **src/setupTests.ts** - Test setup file with global mocks
- **__mocks__/fileMock.js** - Mock for static file imports

### Test Suites
- **src/App.test.tsx** - Tests for the main App component (4 tests)
- **src/components/OntologyNVLViewer.test.tsx** - Comprehensive NVL component tests (18 tests)

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- App.test.tsx
```

## Test Coverage

### Total Test Cases: 22

#### App Component Tests (4)
1. ✅ Renders without crashing
2. ✅ Renders OntologyNVLViewer component
3. ✅ Has full viewport height
4. ✅ Has full viewport width

#### OntologyNVLViewer Component Tests (18)
1. ✅ Renders without crashing
2. ✅ Displays loading state while fetching data
3. ✅ Loads and displays data successfully
4. ✅ Handles data loading errors gracefully
5. ✅ Handles HTTP errors
6. ✅ Filters nodes based on search term
7. ✅ Shows all nodes when search term is cleared
8. ✅ Changes layout when layout selector is changed
9. ✅ Handles node click and displays details
10. ✅ Handles node double-click
11. ✅ Handles relationship click
12. ✅ Exports data as JSON file
13. ✅ Handles empty data gracefully
14. ✅ Displays correct statistics
15. ✅ Applies custom width and height
16. ✅ Throws error when neither data nor dataUrl is provided
17. ✅ Displays node properties in details panel
18. ✅ Sets initial layout correctly

### Estimated Coverage
- **Statements**: ~85%
- **Branches**: ~80%
- **Functions**: ~90%
- **Lines**: ~85%

## Test Categories

### 1. Component Rendering Tests
- Basic rendering
- Props validation
- Custom dimensions

### 2. Data Loading Tests
- Successful data fetch
- HTTP error handling
- Network error handling
- Loading states

### 3. User Interaction Tests
- Node click events
- Node double-click events
- Relationship click events
- Search functionality
- Layout switching

### 4. Feature Tests
- Data export
- Statistics display
- Node details panel
- Empty data handling

### 5. Edge Cases
- Missing data/URL
- Empty datasets
- Error states

## Best Practices Used

1. **Comprehensive Mocking**
   - Mocked Neo4j NVL library
   - Mocked fetch API
   - Mocked file operations

2. **Isolation**
   - Tests are independent
   - Mocks cleared between tests
   - No shared state

3. **Accessibility**
   - Uses testing-library queries
   - Tests user-facing behavior
   - Avoids implementation details

4. **Coverage**
   - Tests success paths
   - Tests error paths
   - Tests edge cases

5. **TypeScript**
   - Full type safety
   - Proper interfaces
   - Type assertions where needed

## Notes

- Tests do not require actual Neo4j NVL library (mocked)
- Tests do not require actual data files (mocked fetch)
- All tests are synchronous or properly async/await
- Coverage thresholds set to 70% minimum
