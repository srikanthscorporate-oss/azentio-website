import { Container, PageHeader } from "@/components/ui";
import { BuildCta, NumberedCards } from "@/components/sections";

// Public page: validated in dev to render an instant static shell.
export const instant = true;
export const metadata = { title: "AI Lab" };

const LAB = [
  ["Inside the Lab", "Where emerging technologies meet practical challenges. We experiment, prototype, validate and refine ideas."],
  ["What We're Exploring", "Agentic AI, small language models, multimodal intelligence and AI-assisted engineering."],
  ["Build Stories", "How prototypes become products: what worked, what didn't, and what we learned."],
  ["Hackathons & Collaboration", "Build Labs and partner challenges that turn ambitious ideas into working AI solutions."],
] as const;

export default function Lab() {
  return (
    <>
      <Container>
        <PageHeader eyebrow="AI Lab" title="Experiment Boldly. Engineer Purposefully.">
          Public notes from the lab. Internal experiments stay in the employee portal.
        </PageHeader>
      </Container>
      <Container className="pb-6">
        <NumberedCards items={LAB} />
      </Container>
      <BuildCta title="Bring Us a Challenge." text="Share a problem worth solving or join the next Build Labs hackathon." />
    </>
  );
}
