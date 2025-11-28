export const TITLE_LEVELS = [
    { min: 0, title: "Ticket Holder", color: "text-slate-400", bgColor: "bg-slate-400" },
    { min: 10, title: "Popcorn Regular", color: "text-yellow-500", bgColor: "bg-yellow-500" },
    { min: 50, title: "Screen Enthusiast", color: "text-sky-400", bgColor: "bg-sky-400" },
    { min: 100, title: "Cinema Scholar", color: "text-purple-400", bgColor: "bg-purple-400" },
    { min: 200, title: "Film Connoisseur", color: "text-red-400", bgColor: "bg-red-400" },
    { min: 500, title: "Silver Screen Sage", color: "text-emerald-400", bgColor: "bg-emerald-400" },
    { min: 1000, title: "Cinema Immortal", color: "text-amber-400", bgColor: "bg-amber-400" }
];

export const getUserTitle = (count) => {
    let currentLevel = TITLE_LEVELS[0];
    let nextLevel = TITLE_LEVELS[1];

    for (let i = 0; i < TITLE_LEVELS.length; i++) {
        if (count >= TITLE_LEVELS[i].min) {
            currentLevel = TITLE_LEVELS[i];
            nextLevel = TITLE_LEVELS[i + 1] || null;
        } else {
            break;
        }
    }

    let progress = 0;
    let needed = 0;

    if (nextLevel) {
        const range = nextLevel.min - currentLevel.min;
        const currentProgress = count - currentLevel.min;
        progress = Math.min(100, Math.max(0, (currentProgress / range) * 100));
        needed = nextLevel.min - count;
    } else {
        progress = 100;
        needed = 0;
    }

    return {
        current: currentLevel,
        next: nextLevel,
        progress,
        needed
    };
};
