"use client";

import { useEffect, useId, useRef, useState } from "react";

// Only the description toggle needs hydration; card data and ratings stay on
// the server. Measure real overflow so short descriptions need no extra action.
export function ProductDescription({ description, name }: { description: string; name: string }) {
  const id = useId();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = paragraph.current;
    if (!element || expanded) return;
    let active = true;
    const measure = () => {
      if (active && element.isConnected) setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [description, expanded]);

  return <div className="mt-2">
    <p ref={paragraph} id={id} className={`min-h-[4.5rem] whitespace-pre-line text-sm leading-6 text-[#5d665f] ${expanded ? "" : "line-clamp-3"}`}>{description}</p>
    <div className="min-h-11">
      {(canExpand || expanded) && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className="inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4 hover:text-[#86513a]">
        {expanded ? "Show less" : "Read more"}<span className="sr-only"> about {name}</span>
      </button>}
    </div>
  </div>;
}
