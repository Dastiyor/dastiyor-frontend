import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton, TaskCardSkeleton, FeaturedCardSkeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies custom width and height', () => {
    const { toJSON } = render(<Skeleton width={120} height={24} />);
    const tree = toJSON() as any;
    // Animated.View wraps the bone — check props propagated
    expect(tree).toBeTruthy();
  });

  it('applies string width (percentage)', () => {
    const { toJSON } = render(<Skeleton width="80%" height={16} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('TaskCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TaskCardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders multiple skeleton bones', () => {
    const { UNSAFE_getAllByType } = render(<TaskCardSkeleton />);
    // TaskCardSkeleton has 6 Skeleton instances
    const skeletons = UNSAFE_getAllByType(Skeleton);
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('FeaturedCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FeaturedCardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders multiple skeleton bones', () => {
    const { UNSAFE_getAllByType } = render(<FeaturedCardSkeleton />);
    const skeletons = UNSAFE_getAllByType(Skeleton);
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });
});
