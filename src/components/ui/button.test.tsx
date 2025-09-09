import { render, screen } from '@testing-library/react';
import { Button } from './button'; // Assuming this is the shadcn/ui button

describe('Button', () => {
  it('renders correctly with children', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button', { name: /test button/i })).toBeInTheDocument();
  });

  it('applies custom class names', () => {
    render(<Button className="custom-class">Styled Button</Button>);
    expect(screen.getByRole('button', { name: /styled button/i })).toHaveClass('custom-class');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button', { name: /disabled button/i })).toBeDisabled();
  });
});