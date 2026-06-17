import { useCallback, useEffect, useMemo, useState } from "react";
import Slider from "react-slick";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  BarChart2,
  ChevronRight,
  Flame,
  Gem,
  Trophy,
  TrendingUp,
} from "lucide-react";

const SLIDES = [
  {
    id: "binance",
    title: "Binance Campaign",
    description: "Exclusive campaign on Binance Wallet with $300,000 rewards",
    badge: "ACTIVE",
    footer: "Jun 15 - Jul 15",
    route: "binance",
    bg: "linear-gradient(135deg, #0d1117 0%, #161b22 60%, #1a2332 100%)",
    border: "rgba(240,185,11,0.25)",
    accent: "#F0B90B",
    Icon: Gem,
  },

  {
    id: "volume-league",
    title: "Volume League",
    description:
      "Earn guaranteed rewards with simple steps from the $500,000 pool",
    badge: "NEW",
    footer: "$500,000 Pool",
    route: "/campaigns?campaign=volume-league",
    bg: "linear-gradient(135deg, #05101f 0%, #0a1f3d 50%, #0d2d5e 100%)",
    border: "rgba(59,130,246,0.35)",
    accent: "#60a5fa",
    Icon: BarChart2,
  },
  {
    id: "prove-your-portfolio",
    title: "Prove Your Portfolio",
    description: "Share your portfolio on socials and split $50,000 rewards",
    badge: "ACTIVE",
    footer: "$50,000 Rewards",
    route: "/campaigns?campaign=prove-your-portfolio",
    bg: "linear-gradient(135deg, #1a0505 0%, #3d0d0d 50%, #5c1a00 100%)",
    border: "rgba(239,68,68,0.35)",
    accent: "#fb923c",
    Icon: Trophy,
  },
];

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

function useSlidesToShow(variant) {
  const getCount = useCallback(() => {
    if (variant === "compact") return 1;
    if (typeof window === "undefined") return 1;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 1024) return 2;
    return 3;
  }, [variant]);

  const [slidesToShow, setSlidesToShow] = useState(getCount);

  useEffect(() => {
    const onResize = () => setSlidesToShow(getCount());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getCount]);

  return slidesToShow;
}

export function CampaignSlider({
  variant = "default",
  matchedHeight = false,
  onBinanceClick,
  disabled = false,
  className = "",
}) {
  const navigate = useNavigate();
  const slidesToShow = useSlidesToShow(variant);

  const handleSlideClick = useCallback(
    (slideId, event) => {
      if (disabled) return;

      const sliderNode = event.currentTarget.closest(".slick-slider");
      if (sliderNode?.classList.contains("slick-dragging")) return;

      getSlideAction(slideId, { onBinanceClick, navigate });
    },
    [disabled, navigate, onBinanceClick],
  );

  const settings = useMemo(
    () => ({
      dots: false,
      infinite: SLIDES.length > slidesToShow,
      speed: 400,
      slidesToShow,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 3000,
      pauseOnHover: true,
      pauseOnFocus: true,
      arrows: false,
      swipe: true,
      draggable: true,
      touchMove: true,
      swipeToSlide: true,
      touchThreshold: 8,
    }),
    [slidesToShow],
  );

  return (
    <div
      className={`campaign-slider w-full ${matchedHeight ? "sm:campaign-slider--matched" : ""} ${className}`}
    >
      <style>{`
        .campaign-slider .slick-list {
          overflow: hidden;
          margin: 0 -0.35rem;
        }

        .campaign-slider.campaign-slider--matched .slick-list,
        .campaign-slider.campaign-slider--matched .slick-track,
        .campaign-slider.campaign-slider--matched .slick-slide,
        .campaign-slider.campaign-slider--matched .slick-slide > div {
          height: 100%;
        }

        .campaign-slider.campaign-slider--matched .slick-slide > div {
          min-height: 168px;
        }

        .campaign-slider .slick-track {
          display: flex;
          align-items: stretch;
        }

        .campaign-slider .slick-slide {
          height: auto;
        }

        .campaign-slider .slick-slide > div {
          height: 100%;
          padding: 0 0.35rem;
        }

        .campaign-slider-dots {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .campaign-slider-dots li {
          margin: 0;
          width: auto;
          height: auto;
        }

        .campaign-slider-dots li button {
          padding: 0;
          width: auto;
          height: auto;
        }

        .campaign-slider-dots li button::before {
          display: none;
        }

        .campaign-slider-dots li.slick-active .campaign-slider-dot {
          width: 1rem;
          background-color: rgb(31 41 55);
        }
      `}</style>

      <Slider key={slidesToShow} {...settings}>
        {SLIDES.map((slide) => (
          <div key={slide.id}>
            <motion.button
              type="button"
              // whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(event) => handleSlideClick(slide.id, event)}
              disabled={disabled}
              className={`relative w-full rounded-2xl text-left disabled:opacity-60 ${
                matchedHeight
                  ? "sm:min-h-[168px] h-full"
                  : "h-[88px] sm:h-[120px] lg:h-[140px]"
              }`}
              style={{
                background: slide.bg,
                border: `1px solid ${slide.border}`,
              }}
              aria-label={`${slide.title}: ${slide.description}`}
            >
              <motion.div
                animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0.65, 0.35] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${slide.accent}66 0%, transparent 70%)`,
                }}
              />
              <motion.div
                animate={{ x: ["-110%", "210%"] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 3,
                }}
                className="pointer-events-none absolute inset-y-0 w-1/4 skew-x-[-20deg]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${slide.accent}1f, transparent)`,
                }}
              />
              <span className="pointer-events-none absolute left-0 top-2 sm:left-3 sm:top-2 text-xs text-[#F0B90B]">
                ✦
              </span>
              <span className="pointer-events-none absolute left-8 top-0 sm:left-8 sm:top-4 text-[10px] text-[#F0B90B]/80">
                ✦
              </span>
              {slide.id === "volume-league" && (
                <div className="absolute -top-px left-0 right-0 flex justify-center z-20">
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex items-center gap-1 px-3 py-0.5 text-[10px] font-black tracking-widest uppercase rounded-b-lg"
                    style={{
                      background:
                        "linear-gradient(90deg, #eb3225, #f63b3b, #eb3225)",
                      color: "#fff",
                      letterSpacing: "0.12em",
                      boxShadow: "0 2px 12px rgba(246, 109, 59, 0.5)",
                    }}
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-flex items-center justify-center"
                    >
                      <Flame
                        size={14}
                        strokeWidth={2.2}
                        color="#FBBF24"
                        fill="currentColor"
                      />
                    </motion.span>
                    HOT
                  </motion.div>
                </div>
              )}

              <div className="relative z-10 flex h-full flex-col justify-center p-3 sm:p-4">
                <div className="relative flex flex-col gap-1">
                  <span
                    className=" w-fit absolute right-0 top-0 sm:-top-5 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold self-end"
                    style={{
                      background: `${slide.accent}24`,
                      color: slide.accent,
                      border: `1px solid ${slide.accent}55`,
                    }}
                  >
                    Earn
                  </span>

                  <div
                    className="truncate text-[11px] sm:text-[13px]"
                    style={{ color: `${slide.accent}CC` }}
                  >
                    {slide.title}
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-white">
                    {slide.id === "volume-league" ? (
                      <>
                        Earn{" "}
                        <b style={{ color: slide.accent, fontWeight: "bold" }}>
                          guaranteed
                        </b>{" "}
                        rewards with simple steps. $500,000 rewards
                      </>
                    ) : (
                      slide.description
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end absolute bottom-3 right-3">
                  {/* <div className="flex items-center gap-1">
                    <Gem size={12} style={{ color: slide.accent }} />
                    <span
                      className="text-[11px] sm:text-xs font-bold"
                      style={{ color: slide.accent }}
                    >
                      {slide.footer}
                    </span>
                  </div> */}
                  {/* <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg border"
                    style={{
                      background: `${slide.accent}1A`,
                      borderColor: `${slide.accent}59`,
                    }}
                  >
                    <slide.Icon size={15} style={{ color: slide.accent }} />
                  </div> */}
                  {slide.id === "binance" && (
                    <img
                      src="https://cdn.allox.ai/allox/binance-yellow.png"
                      alt=""
                      className="h-6 w-6"
                    />
                  )}
                </div>
              </div>
              {/* <ChevronRight
                size={14}
                className="absolute bottom-3 right-3"
                style={{ color: `${slide.accent}AA` }}
              /> */}
            </motion.button>
          </div>
        ))}
      </Slider>
    </div>
  );
}
