/**
 * Categorizes a cast member based on their billing order (index).
 * 
 * Categories:
 * 0-3: Starring
 * 4-8: Supporting
 * 9-15: Featured
 * 16-25: Minor Roles
 * 26+: Blink & Miss
 * 
 * @param {number} index - The index of the cast member in the credits list (0-based).
 * @returns {string} The billing category.
 */
export const getBillingCategory = (index) => {
    if (index < 0) return 'Unknown'; // Safety check
    if (index === 0) return 'Lead';
    if (index <= 4) return 'Starring';
    if (index <= 8) return 'Co-Starring';
    if (index <= 14) return 'Featured';
    if (index <= 25) return 'Minor Roles';
    return 'Blink & Miss';
};

/**
 * Returns the color associated with a billing category.
 * Useful for UI badges or text coloring.
 * 
 * @param {string} category - The billing category.
 * @returns {string} Tailwind text color class or hex code.
 */
export const getBillingCategoryColor = (category) => {
    switch (category) {
        case 'Lead': return 'text-amber-500';
        case 'Starring': return 'text-yellow-400';
        case 'Co-Starring': return 'text-blue-400';
        case 'Featured': return 'text-purple-400';
        case 'Minor Roles': return 'text-slate-400';
        case 'Blink & Miss': return 'text-slate-600';
        default: return 'text-slate-500';
    }
};
