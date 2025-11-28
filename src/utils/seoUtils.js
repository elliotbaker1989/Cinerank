export const slugify = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

export const generateMovieUrl = (id, title) => {
    const slug = slugify(title);
    return `/movie/${id}/${slug}`;
};

export const generatePersonUrl = (id, name) => {
    const slug = slugify(name);
    return `/person/${id}/${slug}`;
};
