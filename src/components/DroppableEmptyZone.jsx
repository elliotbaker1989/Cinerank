import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Film } from 'lucide-react';

const DroppableEmptyZone = () => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'empty-top-10',
    });

    return (
        <div
            ref={setNodeRef}
            className={`
                h-40 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-2
                ${isOver
                    ? 'border-sky-500 bg-sky-500/10 scale-[1.02]'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }
            `}
        >
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isOver ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-400'}
            `}>
                <Film size={24} />
            </div>
            <p className={`text-sm font-medium ${isOver ? 'text-sky-400' : 'text-slate-400'}`}>
                Drop your #1 favorite here
            </p>
        </div>
    );
};

export default DroppableEmptyZone;
