import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DevOps Portfolio dashboard', () => {
  render(<App />);
  const headingElement = screen.getByText(/Initializing DevOps Portfolio/i);
  expect(headingElement).toBeInTheDocument();
});
