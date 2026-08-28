import ConsoleNav from "./console-nav";
import ConsoleHero from "./console-hero";
import PipelineStrip from "./pipeline-strip";
import CapabilityGrid from "./capability-grid";
import SourceIndex from "./source-index";
import KeyMap from "./key-map";
import ConsoleCta from "./console-cta";
import ConsoleFooter from "./console-footer";

/**
 * The marketing surface.
 *
 * Composition only. Each module owns its own layout, and the page's job is the
 * order they read in: what it is, what a job becomes, what the four instruments
 * do, what it reads, how you drive it, and then the one action.
 *
 * `.console` is what makes this a locked dark surface with its own palette. The
 * page deliberately does not follow the viewer's theme: it is a picture of an
 * instrument, and an instrument that repaints itself white is not one.
 */
export default function LandingPage() {
  return (
    <div className="console relative min-h-dvh overflow-x-hidden">
      <ConsoleNav />

      <main>
        <ConsoleHero />
        <PipelineStrip />
        <CapabilityGrid />
        <SourceIndex />
        <KeyMap />
        <ConsoleCta />
      </main>

      <ConsoleFooter />
    </div>
  );
}
