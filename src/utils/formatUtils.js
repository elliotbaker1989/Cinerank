export const formatMoney = (amount) => {
    if (!amount) return "$0";
    if (amount >= 1000000000) {
        return `$${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${amount.toLocaleString()}`;
};
