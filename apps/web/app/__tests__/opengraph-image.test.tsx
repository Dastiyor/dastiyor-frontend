import { render, screen } from '@testing-library/react';
import { ImageResponse } from 'next/og';
import OpengraphImage, { size } from '../opengraph-image';

jest.mock('next/og', () => ({ ImageResponse: jest.fn() }));

it('renders a 1200x630 Dastiyor card', () => {
    OpengraphImage();
    const [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls[0];
    expect(options).toEqual({ width: 1200, height: 630 });
    expect(size).toEqual(options);
    render(element);
    expect(screen.getByText('Dastiyor')).toBeInTheDocument();
    expect(screen.getByText('dastiyor.com')).toBeInTheDocument();
});
