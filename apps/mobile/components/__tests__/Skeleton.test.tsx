import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Skeleton, TaskCardSkeleton, FeaturedCardSkeleton } from '../Skeleton';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Skeleton />, { wrapper: Wrapper });
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom width and height', () => {
    const { toJSON } = render(<Skeleton width={120} height={24} />, { wrapper: Wrapper });
    expect(toJSON()).toBeTruthy();
  });

  it('applies string width (percentage)', () => {
    const { toJSON } = render(<Skeleton width="80%" height={16} />, { wrapper: Wrapper });
    expect(toJSON()).toBeTruthy();
  });
});

describe('TaskCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TaskCardSkeleton />, { wrapper: Wrapper });
    expect(toJSON()).toBeTruthy();
  });

  it('renders multiple skeleton bones', () => {
    const { UNSAFE_getAllByType } = render(<TaskCardSkeleton />, { wrapper: Wrapper });
    const skeletons = UNSAFE_getAllByType(Skeleton);
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('FeaturedCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FeaturedCardSkeleton />, { wrapper: Wrapper });
    expect(toJSON()).toBeTruthy();
  });

  it('renders multiple skeleton bones', () => {
    const { UNSAFE_getAllByType } = render(<FeaturedCardSkeleton />, { wrapper: Wrapper });
    const skeletons = UNSAFE_getAllByType(Skeleton);
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });
});
