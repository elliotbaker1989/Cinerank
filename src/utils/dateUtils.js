export const formatReleaseDate = (dateString) => {
    if (!dateString) return null;

    const releaseDate = new Date(dateString);
    const today = new Date();

    // Reset time part for accurate date comparison
    today.setHours(0, 0, 0, 0);
    releaseDate.setHours(0, 0, 0, 0);

    // Only show for future dates
    if (releaseDate <= today) return null;

    const day = releaseDate.getDate();
    const month = releaseDate.toLocaleString('default', { month: 'short' });

    const year = releaseDate.getFullYear();
    return `Rel. ${month} ${day}, ${year}`;
};

export const isInCinema = (dateString) => {
    if (!dateString) return false;
    const releaseDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    releaseDate.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = today - releaseDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Consider "In Cinema" if released within the last 45 days
    return diffDays >= 0 && diffDays <= 45;
};
