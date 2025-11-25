import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Redo, Redo2, RefreshCcw, RotateCcw, Share2, Undo, UnlockIcon, ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import type { ResultData } from "./types/result";
import { ExamplesFooter } from "./components/ExamplesFooter";
import { HistorySidebar, saveToHistory, type HistoryItem } from "./components/HistorySidebar";
import { HistoryButton } from "./components/HistoryButton";
import { getEmail, setEmail, hasEmail } from "./utils/email";
import { usePostHogTracking, POSTHOG_EVENTS, identifyUserWithEmail } from "./utils/posthog";

interface ResultPageProps {
  slug: string;
}

export function ResultPage({ slug }: ResultPageProps) {
  console.log("[ResultPage] Component mounted with slug:", slug);
  
  const posthog = usePostHogTracking();
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [email, setEmailState] = useState<string>("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailPromptTracked, setEmailPromptTracked] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const handleVisitSuperwallClick = useCallback(() => {
    if (posthog) {
      posthog.capture(POSTHOG_EVENTS.VISIT_SUPERWALL_CLICKED, {
        slug: slug,
      });
    }

    if (!hasEmail()) {
      return;
    }

    fetch('/api/customerio/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: POSTHOG_EVENTS.VISIT_SUPERWALL_CLICKED,
        properties: {
          slug: slug,
        },
      }),
      credentials: 'include',
    }).catch((error) => {
      console.error('[ResultPage] Failed to send Customer.io event', error);
    });
  }, [posthog, slug]);

  // Check for email on mount
  useEffect(() => {
    const storedEmail = getEmail();
    if (storedEmail) {
      setEmailState(storedEmail);
      // Always show email input if debug mode is enabled
      setShowEmailInput(isDebug);
      
      // Identify user with email if available
      if (posthog) {
        identifyUserWithEmail(posthog, storedEmail);
      }
    } else {
      setShowEmailInput(true);
    }
  }, [isDebug, posthog]);

  // Track email prompt shown
  useEffect(() => {
    if (showEmailInput && !emailPromptTracked && posthog) {
      posthog.capture(POSTHOG_EVENTS.EMAIL_PROMPT_SHOWN, {
        slug: slug,
      });
      setEmailPromptTracked(true);
    }
  }, [showEmailInput, emailPromptTracked, slug, posthog]);

  // Lock body scroll when email modal is open
  useEffect(() => {
    if (showEmailInput) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEmailInput]);

  // Memoize markdown components to prevent re-render loop
  const markdownComponents = useMemo(() => ({
    h1: () => null, // Hide H1 since we show it in the title
    h2: ({node, ...props}: any) => <h2 className="!text-slate-400 text-lg font-medium uppercase tracking-wider py-2" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="!text-slate-400 text-md font-medium uppercase tracking-wider py-2" {...props} />,
    h4: ({node, ...props}: any) => <h4 className="!text-slate-400 text-md font-normal uppercase tracking-wider py-2" {...props} />,
    h5: ({node, ...props}: any) => <h5 className="!text-slate-400 text-md font-normal uppercase tracking-wider py-2" {...props} />,
    h6: ({node, ...props}: any) => <h6 className="!text-slate-400 text-md font-normal uppercase tracking-wider py-2" {...props} />,
    p: ({node, ...props}: any) => <p className="!text-slate-900 text-lg mb-4" {...props} />,
    ul: ({node, ...props}: any) => <ul className="!text-slate-900 !list-disc !pl-5 !my-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="!text-slate-900 !list-decimal !pl-5 !my-1" {...props} />,
    li: ({node, ...props}: any) => <li className="!text-slate-900 !my-1" {...props} />,
  }), []);

  useEffect(() => {
    console.log("[ResultPage] useEffect triggered, slug:", slug);
    
    async function fetchResult() {
      try {
        console.log("[ResultPage] Starting fetch for slug:", slug);
        setLoading(true);
        setError(null);
        
        const url = `/api/results/${slug}`;
        console.log("[ResultPage] Fetching from URL:", url);
        
        // Include email cookie in request if available
        const response = await fetch(url, {
          credentials: 'include', // Include cookies
        });
        console.log("[ResultPage] Response status:", response.status, response.statusText);
        console.log("[ResultPage] Response ok:", response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[ResultPage] Response not ok, error text:", errorText);
          throw new Error(`Result not found: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as ResultData;
        console.log("[ResultPage] Received data:", {
          id: data.id,
          hasOutput: !!data.generatedOutput,
          outputLength: data.generatedOutput?.length,
          imageCount: data.images?.length,
          createdAt: data.createdAt
        });
        setResult(data);
        
        // Save to history if not already saved
        const title = data.generatedOutput.trim().split('\n')[0]?.replace(/^#\s*/, '') || "Paywall Experiment";
        const historyItem: HistoryItem = {
          id: data.id,
          slug: slug,
          title: title,
          date: data.createdAt,
          url: `/r/${slug}`,
          prompt: data.prompt || '',
        };
        saveToHistory(historyItem);
        
        console.log("[ResultPage] Result state set successfully");
      } catch (err) {
        console.error("[ResultPage] Error fetching result:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load result";
        console.error("[ResultPage] Setting error:", errorMessage);
        setError(errorMessage);
      } finally {
        console.log("[ResultPage] Setting loading to false");
        setLoading(false);
      }
    }

    fetchResult();
  }, [slug]);

  // Check for overflow when images load or window resizes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let delayedCheckId: NodeJS.Timeout | null = null;

    const checkOverflow = () => {
      if (scrollContainerRef.current) {
        // Use requestAnimationFrame to ensure layout has settled
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const hasOverflowX = scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
            setHasOverflow(hasOverflowX);
          }
        });
      }
    };

    // Check after images load
    if (result && result.images.length > 0) {
      // Small delay to ensure DOM has updated
      timeoutId = setTimeout(() => {
        // Wait for images to load
        const images = scrollContainerRef.current?.querySelectorAll('img');
        if (images && images.length > 0) {
          let loadedCount = 0;
          const totalImages = images.length;
          
          images.forEach((img) => {
            if (img.complete) {
              loadedCount++;
            } else {
              img.onload = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                  checkOverflow();
                }
              };
            }
          });
          
          if (loadedCount === totalImages) {
            checkOverflow();
          } else {
            // If images aren't loaded yet, check anyway after a delay
            delayedCheckId = setTimeout(checkOverflow, 100);
          }
        } else {
          // No images found yet, check again after a short delay
          delayedCheckId = setTimeout(checkOverflow, 100);
        }
      }, 0);
    }

    // Also check on window resize
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (delayedCheckId) clearTimeout(delayedCheckId);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [result]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    const text = `${url}`;
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    
    // Track share link clicked
    if (posthog) {
      posthog.capture(POSTHOG_EVENTS.SHARE_LINK_CLICKED, {
        slug: slug,
      });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setIsSubmittingEmail(true);
    const trimmedEmail = email.trim();
    setEmail(trimmedEmail); // This sets both cookie and localStorage
    
    // Track email entered event
    if (posthog) {
      posthog.capture(POSTHOG_EVENTS.EMAIL_ENTERED, {
        slug: slug,
        email: trimmedEmail,
      });
      
      // Identify user with email
      identifyUserWithEmail(posthog, trimmedEmail);
    }
    
    // Save email to database
    try {
      const saveResponse = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail,
          slug: slug,
        }),
      });

      if (!saveResponse.ok) {
        console.error("[ResultPage] Error saving email:", await saveResponse.text());
      }
    } catch (err) {
      console.error("[ResultPage] Error saving email:", err);
    }
    
    // Reload the result to get full content
    try {
      const url = `/api/results/${slug}`;
      const response = await fetch(url, {
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json() as ResultData;
        setResult(data);
        setShowEmailInput(false);
      }
    } catch (err) {
      console.error("[ResultPage] Error fetching full result:", err);
    } finally {
      setIsSubmittingEmail(false);
    }
  };


  console.log("[ResultPage] Render - loading:", loading, "error:", error, "hasResult:", !!result);

  if (loading) {
    console.log("[ResultPage] Rendering loading state");
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !result) {
    console.log("[ResultPage] Rendering error state - error:", error, "result:", result);
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Not Found</h1>
          <p className="text-slate-600 mb-6">{error || "This result doesn't exist"}</p>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  console.log("[ResultPage] Rendering result with title extraction");
  const title = result.generatedOutput.trim().split('\n')[0]?.replace(/^#\s*/, '') || "Paywall Experiment";
  console.log("[ResultPage] Extracted title:", title);
  console.log("[ResultPage] Rendering full result page");

  const isContentTruncated = result.generatedOutput.length > 500 && !hasEmail();
  const displayContent = isContentTruncated 
    ? result.generatedOutput.substring(0, 500) + "..."
    : result.generatedOutput;

  // Create description from prompt or first paragraph of generated output
  const description = result.prompt 
    ? `${result.prompt.substring(0, 100)}...`
    : `AI-generated paywall experiment based on 1,824 lessons from 422 unique experiments run by Superwall.com`;
  
  const currentUrl = `https://paywallexperiments.com/r/${slug}`;

  return (
    <>
      <Helmet>
        <title>{title} - AI Paywall Experiments</title>
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={`${title} - AI Paywall Experiments`} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://paywallexperiments.com/og-result-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={currentUrl} />
        <meta name="twitter:title" content={`${title} - AI Paywall Experiments`} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://paywallexperiments.com/og-result-image.png" />
      </Helmet>
      
      {/* History Sidebar */}
      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      
      {/* Navigation Buttons */}
      <div className="fixed top-4 left-4 z-30 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="bg-white/80 !rounded-full"
        >
          <ArrowLeft className="!w-5 !h-5" />
        </Button>
        <HistoryButton onClick={() => setIsHistoryOpen(true)} />
      </div>
      
      <div className="min-h-[100dvh] bg-slate-50 pt-12 md:pt-32">
      <div className="max-w-3xl mx-auto">
        {/* Email Input Modal */}
        {showEmailInput && (
          <div className="fixed inset-0 bg-slate-100/10 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-[95vw] border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Who goes there?</h2>
              <p className="text-slate-600 mb-6">
                Enter your email to see the full experiment.
              </p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmailState(e.target.value)}
                  required
                  className="w-full"
                  disabled={isSubmittingEmail}
                />
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  variant="juicy"
                  disabled={isSubmittingEmail || !email.includes('@')}
                >
                  {isSubmittingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                    <UnlockIcon className="w-4 h-4 ml-2" />
                    See Results
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">

          {/* Images */}
          {result.images.length > 0 && (
            <div 
              ref={scrollContainerRef}
              className="overflow-x-scroll scrollbar-hide"
            >
              <div className={`flex flex-row gap-2 ${hasOverflow ? 'justify-start' : 'justify-center'}`}>
                <div className="!min-w-2 !min-h-2 "></div>
                {result.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={`Result image ${index + 1}`}
                    className="h-[300px] md:h-[400px] w-auto flex-shrink-0 rounded-2xl border border-[0.5px] object-contain"
                  />
                ))}
                <div className="!min-w-2 !min-h-2"></div>
              </div>
            </div>
          )}

          <div className="pt-12 px-4">

            <div className="inline-flex items-center gap-2 bg-slate-900/5 border border-[0.5px] backdrop-blur-sm px-4 py-2 rounded-full mb-6 text-sm text-slate-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>AI Generated Experiment</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">{title}</h1>
            <p className="text-slate-600 md:text-lg">
              Based on 1,824 lessons from 422 unique experiments run by <a className="text-brand-primary cursor-pointer underline " href="https://superwall.com?ref=paywallexperiments">Superwall.com</a>
            </p>
            </div>
        </div>

        {/* Content */}
        <div className="mb-12 space-y-4 px-4">
          <div className="!px-2 !pt-1 w-full bg-transparent text-slate-900">
            <div className="max-w-none prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
              <Markdown components={markdownComponents}>{displayContent}</Markdown>
            </div>
          </div>
          {isContentTruncated && (
            <div className="text-center pt-4 mr-auto">
              <Button
                onClick={() => {
                  // reload the page
                  window.location.reload();
                }}
                size="xl"
                variant="ghost"
                className=" !border-none"
              >
                Close, but no cigar. Just enter your email <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="text-center w-full flex flex-col items-center justify-center mt-12 md:mt-24 px-4">
        <h2 className="text-3xl py-6 md:text-5xl font-bold max-w-[800px] w-full">
          It doesn't have to be a guessing game – launch this today.
        </h2>
        
        <div className="flex flex-col gap-6">
        <div className="flex flex-row items-center gap-3 mt-6 justify-center flex-4">
    
          <Button
            onClick={handleCopyLink}
            size="xl"
            variant="outline"
            className="border-slate-200 text-slate-900 hover:bg-slate-50"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {copySuccess ? "Copied!" : "Share Link"}
          </Button>

          <Button
            asChild
            size="xl"
            variant="juicy"
          >
            <a 
              href="https://superwall.com?ref=paywallexperiments" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={handleVisitSuperwallClick}
            >
              <span className="hidden md:block">Visit</span> Superwall <ArrowRight className="w-4 h-4 " />
            </a>
          </Button>
        </div>
          <Button
            onClick={() => {
              // Track try another clicked
              if (posthog) {
                posthog.capture(POSTHOG_EVENTS.TRY_ANOTHER_CLICKED, {
                  slug: slug,
                });
              }
              navigate('/');
            }}
            size="xl"
            variant="ghost"
            className="!border-slate-200/0 text-slate-900 hover:bg-slate-50"
          >
            Try Another
            <RotateCcw className="w-4 h-4 " />
          </Button>
          </div>
      </div>

      {/* Examples Footer */}
      <ExamplesFooter />
    </div>
    </>
  );
}

export default ResultPage;
