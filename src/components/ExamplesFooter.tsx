import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePostHogTracking, POSTHOG_EVENTS } from "../utils/posthog";

const EXAMPLES = [
  {
    id: 1,
    title: "Example 1",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/745089947/paywall-1761325244577.png",
    prompt: "Design a paywall experiment for brainly"
  },
  {
    id: 2,
    title: "Video Editor",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/1191337894/paywall-1760367260143.png",
    prompt: "Design a paywall experiment for this video editing app"
  },
  {
    id: 3,
    title: "Perplexity",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/1668000334/paywall-1754321860221.png",
    prompt: "Design a paywall experiment for this AI chat app"
  },
  {
    id: 4,
    title: "Headspace",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/493145008/paywall-1760719086302.png",
    prompt: "Design a paywall experiment for this meditation app"
  },
  {
    id: 5,
    title: "ChatGPT",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/6448311069/paywall-1757946074763.png",
    prompt: "Design a paywall experiment for this AI chat app"
  },
  {
    id: 6,
    title: "Evernote",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/281796108/paywall-1750266886102.png",
    prompt: "Design a paywall experiment for this note-taking app"
  },
  {
    id: 7,
    title: "Pixelcut",
    image: "https://bepbjmwwfwlsrympfeug.supabase.co/storage/v1/object/public/paywalls/1534785237/paywall-1759940659559.png",
    prompt: "Design a paywall experiment for this AI image editing app"
  },
];

interface ExamplesFooterProps {
  onExampleClick?: (example: typeof EXAMPLES[0]) => void;
}

export function ExamplesFooter({ onExampleClick }: ExamplesFooterProps) {
  const navigate = useNavigate();
  const posthog = usePostHogTracking();

  // Shuffle examples on mount
  const shuffledExamples = useMemo(() => {
    return [...EXAMPLES].sort(() => Math.random() - 0.5);
  }, []);

  const handleExampleClick = (example: typeof EXAMPLES[0]) => {
    // Track example clicked only if no custom handler is provided
    // (when using default navigation behavior)
    if (!onExampleClick && posthog) {
      posthog.capture(POSTHOG_EVENTS.EXAMPLE_CLICKED, {
        example_id: example.id,
        example_title: example.title,
        example_prompt: example.prompt,
      });
    }
    
    if (onExampleClick) {
      onExampleClick(example);
    } else {
      // Default behavior: navigate to home with example data
      navigate('/', { state: { examplePrompt: example.prompt, exampleImage: example.image } });
    }
  };

  return (
    <div className="w-full bg-slate-50 pb-0 h-[240px] md:h-[400px] flex flex-col items-center justify-end">
      <div className="md:pt-[120px] h-[180px] md:!h-[300px] md:hover:!h-[330px] ease-out !duration-[500ms] transition-all overflow-hidden w-full ">
        <div className="max-w-3xl mx-auto pt-32 scale-[60%] md:scale-100">
          {/* Fan-out cards container */}
          <div className="relative h-64 flex items-end justify-center">
            {shuffledExamples.map((example, index) => {
              // Position cards in pyramid: 4th on top, 3rd/5th middle, 2nd/6th bottom, 1st/7th far edges
              const positions: Array<{ rotate: number; translateY: number; left: number }> = [
                { rotate: -24, translateY: 130, left: -390 }, // 1st: far far left, bottom
                { rotate: -16, translateY: 70, left: -260 },  // 2nd: far left, bottom
                { rotate: -8, translateY: 30, left: -130 },   // 3rd: left-center, middle
                { rotate: 0, translateY: 0, left: 0 },        // 4th: center, top
                { rotate: 8, translateY: 30, left: 130 },     // 5th: right-center, middle
                { rotate: 16, translateY: 70, left: 260 },    // 6th: far right, bottom
                { rotate: 24, translateY: 130, left: 390 },   // 7th: far far right, bottom
              ];

              const style = positions[index] || positions[0];

              return (
                <button
                  key={example.id}
                  onClick={() => handleExampleClick(example)}
                  className="absolute bottom-0 w-56 rounded-t-xl bg-white shadow-md overflow-hidden transition-all duration-300 hover:scale-[1.03] origin-bottom cursor-pointer group"
                  style={{
                    transform: `rotate(${style?.rotate}deg) translateY(${style?.translateY}px)`,
                    left: `calc(50% - 112px + ${style?.left}px)`,
                    zIndex: index === 3 ? 10 : Math.abs(index - 3) === 1 ? 5 : Math.abs(index - 3) === 2 ? 3 : 1,
                  }}
                >
                  <img
                    src={example.image}
                    alt={example.title}
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-2">
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

