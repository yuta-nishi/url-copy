import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Contents from '~/contents/hello';

describe('test contents/hello', () => {
  it('should render', () => {
    render(<Contents />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
