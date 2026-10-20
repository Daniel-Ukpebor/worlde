import { useState, type PointerEvent } from "react";
import { geometry, phase, type State } from "./engine/model";
export default function Pan({
  state,
  scrape,
}: {
  state: State;
  scrape: () => void;
}) {
  const [drag, setDrag] = useState<{
    start: number;
    x: number;
    y: number;
  } | null>(null);
  const mixture = state.mixture;
  const fraction = mixture ? phase(mixture.h).frozen : 0;
  const area = mixture ? geometry(mixture).area / 0.18 : 0;
  const width = Math.sqrt(area) * 350;
  const height = Math.sqrt(area) * 232;
  const point = (e: PointerEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) / b.width) * 500,
      y: ((e.clientY - b.top) / b.height) * 350,
    };
  };
  return (
    <div className="pan-assembly">
      <div className="pan-model-label">
        <span>SS-01 / LUMPED THERMAL SURFACE</span>
        <span>0.18 m²</span>
      </div>
      <svg
        className={`pan-svg ${mixture ? "loaded" : ""}`}
        viewBox="0 0 500 350"
        role="img"
        aria-label={`Virtual freezing pan, ${state.pan.toFixed(1)} degrees Celsius${mixture ? `, ${(fraction * 100).toFixed(0)} percent modeled frozen` : ", empty"}`}
        onPointerDown={(e) => {
          if (!mixture) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = point(e);
          setDrag({ start: p.x, ...p });
        }}
        onPointerMove={(e) => {
          if (drag) setDrag({ ...drag, ...point(e) });
        }}
        onPointerUp={(e) => {
          if (drag && Math.abs(point(e).x - drag.start) > 130) scrape();
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <linearGradient id="housing" x2="0" y2="1">
            <stop stopColor="#76858d" />
            <stop offset=".1" stopColor="#3d4a53" />
            <stop offset="1" stopColor="#151d23" />
          </linearGradient>
          <linearGradient id="steel" x1="0" y1="0" x2="1" y2=".8">
            <stop stopColor="#5d707b" />
            <stop offset=".35" stopColor="#84949b" />
            <stop offset=".52" stopColor="#697e89" />
            <stop offset="1" stopColor="#4d626d" />
          </linearGradient>
          <linearGradient id="rim">
            <stop stopColor="#91a0a7" />
            <stop offset=".5" stopColor="#c2ccd0" />
            <stop offset="1" stopColor="#5b6b75" />
          </linearGradient>
          <pattern
            id="brush"
            width="6"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 1H6" stroke="#d3e0e6" opacity=".055" />
          </pattern>
          <linearGradient id="blade">
            <stop stopColor="#8e9da6" />
            <stop offset=".6" stopColor="#e3eaed" />
            <stop offset="1" stopColor="#62747f" />
          </linearGradient>
        </defs>
        <rect x="25" y="32" width="450" height="302" rx="19" fill="#080d10" />
        <rect
          x="19"
          y="22"
          width="462"
          height="305"
          rx="15"
          fill="url(#housing)"
          stroke="#6f8089"
        />
        <rect x="19" y="16" width="462" height="285" rx="14" fill="url(#rim)" />
        <rect
          x="35"
          y="31"
          width="430"
          height="253"
          rx="8"
          fill="#273c47"
          stroke="#344b58"
          strokeWidth="3"
        />
        <rect
          x="40"
          y="36"
          width="420"
          height="243"
          rx="5"
          fill="url(#steel)"
        />
        <rect
          x="40"
          y="36"
          width="420"
          height="243"
          rx="5"
          fill="url(#brush)"
        />
        <rect
          x="40"
          y="36"
          width="420"
          height="243"
          rx="5"
          fill="#99dcf2"
          opacity={Math.min(0.15, Math.max(0, -state.pan / 200))}
        />
        {[52, 448].flatMap((x) =>
          [45, 271].map((y) => (
            <g key={`${x}${y}`}>
              <circle cx={x} cy={y} r="3.3" fill="#2e414b" />
              <path d={`M${x - 2} ${y}h4`} stroke="#92a2aa" strokeWidth=".8" />
            </g>
          )),
        )}
        <path
          d="M250 42V275M45 157H455"
          stroke="#d1e3e9"
          opacity=".13"
          strokeDasharray="3 5"
        />
        {mixture && (
          <g>
            <rect
              x={250 - width / 2}
              y={157 - height / 2}
              width={width}
              height={height}
              rx={16 - fraction * 11}
              fill={`rgb(${Math.round(211 + fraction * 26)},${Math.round(194 + fraction * 32)},${Math.round(163 + fraction * 44)})`}
              opacity=".94"
              stroke="#f3e8d6"
              strokeWidth="1.4"
            />
            {fraction > 0.25 &&
              Array.from({ length: 9 }, (_, i) => (
                <path
                  key={i}
                  d={`M${250 - width / 2 + 9} ${157 - height / 2 + 12 + (i * (height - 24)) / 8}h${width - 18}`}
                  stroke="#fff9ef"
                  opacity={fraction * 0.25}
                  strokeWidth="1"
                />
              ))}
            <text
              x="250"
              y="151"
              textAnchor="middle"
              fill="#4c514e"
              fontSize="11"
              fontFamily="monospace"
            >
              {phase(mixture.h).temperature.toFixed(1)} °C
            </text>
            <text
              x="250"
              y="168"
              textAnchor="middle"
              fill="#6c6b60"
              fontSize="8"
              fontFamily="monospace"
            >
              MIXTURE NODE
            </text>
          </g>
        )}
        {!mixture && (
          <g opacity=".5">
            <path d="M237 144h26M250 131v26" stroke="#c5dbe4" />
            <text
              x="250"
              y="182"
              textAnchor="middle"
              fontSize="9"
              fontFamily="monospace"
              fill="#d2e3e8"
            >
              ADD MIXTURE TO BEGIN
            </text>
          </g>
        )}
        <text
          x="49"
          y="265"
          fill="#d8e6eb"
          opacity=".7"
          fontSize="8"
          fontFamily="monospace"
        >
          COLDLOOP / THERMAL BENCH
        </text>
        <g
          transform={`translate(${drag ? Math.min(430, Math.max(70, drag.x)) : 395},${drag ? Math.min(230, Math.max(90, drag.y)) : 226}) rotate(-18)`}
        >
          <path
            d="M-33 0L-29 -43H29L33 0Z"
            fill="url(#blade)"
            stroke="#344652"
          />
          <rect
            x="-14"
            y="-58"
            width="28"
            height="21"
            rx="3"
            fill="#17242b"
            stroke="#566b77"
          />
          <path d="M-24 -7H24" stroke="#f0f7fa" strokeWidth="1" />
        </g>
        <text x="47" y="318" fontFamily="monospace" fontSize="9" fill="#a7bac4">
          VIRTUAL WORKSTATION
        </text>
        <circle
          cx="445"
          cy="313"
          r="3"
          fill={state.compressor ? "#8bd4e6" : "#4e5d66"}
        />
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={`M${264 + i * 10} 309v10`}
            stroke="#0b1217"
            strokeWidth="3"
          />
        ))}
      </svg>
      <div className="pan-caption">
        <span className="crosshair">⌖</span>{" "}
        {mixture
          ? "Drag the scraper across the pan to remove the batch."
          : "One pan node. One mixture node. Real energy accounting."}
      </div>
    </div>
  );
}
