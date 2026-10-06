import { twMerge } from 'tailwind-merge';
import classNames, { Argument } from 'classnames';

export function cn(...inputs: Argument[]) {
    return twMerge(classNames(inputs));
}

/**
 * Compare two fractional-indexing position keys in ASCII byte order.
 * DO NOT use localeCompare, as it places uppercase letters (e.g. 'Zz' generated
 * when moving to the start of a list) after lowercase letters ('a0', 'a1'...),
 * which reverses the order.
 */
export function comparePositions(a?: string | null, b?: string | null): number {
    const posA = a || '';
    const posB = b || '';
    if (posA && posB && posA !== posB) {
        return posA < posB ? -1 : 1;
    }
    if (posA && !posB) return -1;
    if (!posA && posB) return 1;
    return 0;
}
