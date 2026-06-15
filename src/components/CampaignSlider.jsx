import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useMotionValue, animate } from "motion/react";
import { Gem, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";

const SLIDES = [
  {
    id: "binance",
    title: "Binance Campaign",
    description: "Create a portfolio on BNB Chain to earn rewards",
    bgClass: "bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50",
    borderClass: "border-orange-200/50",
    tag: "Earn",
    tagClass: "bg-amber-400/90 text-amber-950",
    icon: (
      <img
        src="https://cdn.allox.ai/allox/binance.svg"
        alt=""
        className="h-7 w-7 sm:h-8 sm:w-8"
      />
    ),
    iconWrapClass: "bg-white/80",
  },
  {
    id: "volume-league",
    title: "Volume League",
    description: "Compete in the Volume League for exclusive rewards",
    bgClass: "bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50",
    borderClass: "border-purple-200/50",
    tag: "Compete",
    tagClass: "bg-purple-400/90 text-purple-950",
    icon: (
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
        <Gem size={14} className="text-white" strokeWidth={2.5} />
      </div>
    ),
    iconWrapClass: "bg-white/60",
  },
  {
    id: "prove-your-portfolio",
    title: "Prove Your Portfolio",
    description: "Showcase your skills and earn rewards",
    bgClass: "bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50",
    borderClass: "border-cyan-200/50",
    tag: "Compete",
    tagClass: "bg-cyan-500/90 text-cyan-950",
    icon: (
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500">
        <TrendingUp size={14} className="text-white" strokeWidth={2.5} />
      </div>
    ),
    iconWrapClass: "bg-white/60",
  },
];

const SWIPE_OFFSET_THRESHOLD = 40;
const SWIPE_VELOCITY_THRESHOLD = 250;
const DRAG_CLICK_THRESHOLD = 6;

function getSlideAction(slideId, { onBinanceClick, navigate }) {
  if (slideId === "binance") {
    onBinanceClick?.();
    return;
  }
  if (slideId === "volume-league") {
    navigate("/campaigns?campaign=volume-league");
    return;
  }
  if (slideId === "prove-your-portfolio") {
    navigate("/campaigns?campaign=prove-your-portfolio");
  }
}

export function CampaignSlider({
  variant = "default",
  onBinanceClick,
  disabled = false,
  className = "",
}) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const blockNextClickRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const x = useMotionValue(0);
  const isCompact = variant === "compact";

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      setContainerWidth(node.offsetWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerWidth) return;
    animate(x, -index * containerWidth, {
      type: "spring",
      stiffness: 320,
      damping: 32,
    });
  }, [containerWidth, index, x]);

  useEffect(() => {
    if (paused || !containerWidth) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [containerWidth, paused]);

  const goToSlide = useCallback((nextIndex) => {
    setIndex(Math.max(0, Math.min(nextIndex, SLIDES.length - 1)));
  }, []);

  const handleDragEnd = useCallback(
    (_, info) => {
      if (!containerWidth) return;

      const { offset, velocity } = info;
      const swipeLeft =
        offset.x < -SWIPE_OFFSET_THRESHOLD ||
        velocity.x < -SWIPE_VELOCITY_THRESHOLD;
      const swipeRight =
        offset.x > SWIPE_OFFSET_THRESHOLD ||
        velocity.x > SWIPE_VELOCITY_THRESHOLD;

      if (swipeLeft) {
        goToSlide(index + 1);
        return;
      }
      if (swipeRight) {
        goToSlide(index - 1);
        return;
      }

      animate(x, -index * containerWidth, {
        type: "spring",
        stiffness: 320,
        damping: 32,
      });
    },
    [containerWidth, goToSlide, index, x],
  );

  const handleSlideClick = useCallback(
    (slideId) => {
      if (disabled || blockNextClickRef.current) {
        blockNextClickRef.current = false;
        return;
      }
      getSlideAction(slideId, { onBinanceClick, navigate });
    },
    [disabled, navigate, onBinanceClick],
  );

  const dragConstraints = {
    left: containerWidth ? -(containerWidth * (SLIDES.length - 1)) : 0,
    right: 0,
  };

  return (
    <div
      className={`${isCompact ? "w-full" : "mx-auto w-full max-w-[466px]"} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-gray-200/40 bg-white/40"
      >
        <motion.div
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x }}
          drag={containerWidth ? "x" : false}
          dragConstraints={dragConstraints}
          dragElastic={0.08}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            blockNextClickRef.current =
              Math.abs(info.offset.x) > DRAG_CLICK_THRESHOLD;
            handleDragEnd(_, info);
          }}
        >
          {SLIDES.map((slide) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => handleSlideClick(slide.id)}
              disabled={disabled}
              style={{ width: containerWidth || "100%" }}
              className={`shrink-0 text-left transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${slide.bgClass} ${slide.borderClass} ${
                isCompact ? "px-3 py-2.5" : "px-4 py-3"
              }`}
              aria-label={`${slide.title}: ${slide.description}`}
            >
              <div className="relative min-h-[44px] sm:min-h-[48px]">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full p-1.5 ${slide.iconWrapClass}`}
                  >
                    {slide.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate font-semibold text-gray-900 ${
                        isCompact ? "text-xs" : "text-sm sm:text-[15px]"
                      }`}
                    >
                      {slide.title}
                    </div>
                    <div
                      className={`mt-0.5 line-clamp-2 text-gray-600 ${
                        isCompact
                          ? "text-[10px] leading-snug"
                          : "text-xs leading-snug"
                      }`}
                    >
                      {slide.description}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
          {SLIDES.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSlide(dotIndex)}
              className={`rounded-full transition-all ${
                dotIndex === index
                  ? "h-1.5 w-4 bg-gray-800"
                  : "h-1.5 w-1.5 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Show ${item.title}`}
              aria-current={dotIndex === index ? "true" : undefined}
            />
          ))}
        </div> */}
      </div>
    </div>
  );
}
