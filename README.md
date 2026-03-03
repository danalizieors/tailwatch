# Tailwatch

Tailwatch is a live event monitor designed for one simple purpose: to answer the question **"What is happening in my system right now?"**

It sits in the sweet spot between messy, overwhelming logs and complex, heavy monitoring tools. It provides a clean, real-time status for your AI agents, human-in-the-loop workflows, and distributed services.

## The Vision: Instant Clarity

When running complex systems—like multi-step AI agents, long-running deployment pipelines, or human-in-the-loop tasks—it's easy to lose the thread. You know something is happening, but is it _stuck_? Is it _busy_? Or is it _idle_?

Tailwatch transforms a stream of raw data into a living **Status Board**. Instead of tailing logs and searching for specific markers, you glance at the board to see the state of every component at once.

## Human-in-the-Loop Notifications

Tailwatch's **native push notification system** is built for real-time collaboration between systems and humans. You don't need to keep the dashboard open to know when your attention is required.

- **Cross-Platform Alerts**: Receive instant push notifications on your desktop, tablet, or phone.
- **State-Triggered Notifications**: Get notified the moment a process switches to `busy` (indicating it has started) or stays busy for longer than expected.
- **Mobile-First Design**: Install Tailwatch as a PWA on your mobile device to get a native-app experience with reliable background alerts for your long-running tasks.

## The Two Essential Views

Tailwatch provides two complementary views that work together to show you the full picture.

### 1. The Status Board (The "Now" View)

A live snapshot of your entire system's health.

- **Identify Stalls**: Spot jobs that have been "busy" for longer than expected.
- **Visualize Flow**: Watch as different components switch from idle to busy in a coordinated sequence.
- **Second-Monitor Ready**: A high-level dashboard designed to be kept open and visible.

### 2. The Log Stream (The "Timeline" View)

A real-time feed of every message as it arrives.

- **Watch the Thinking**: Follow the step-by-step logic of an AI agent or a manual approval process.
- **Contextual Details**: See the specific messages or state changes as they happen.
- **Coordinated Tracking**: Color-coded paths make it easy to follow multiple interleaved streams.

## The Conceptual Model

Tailwatch is built on three core ideas that make monitoring feel natural:

- **The Busy/Idle State Machine**: Every event in Tailwatch is either `busy` or `idle`. This binary status tells you instantly if a job is actively working or if it has reached a resting state. It’s the simplest possible heartbeat for any process.
- **Hierarchical Paths**: Organize your systems using a familiar, file-system-like structure. Group events under paths like `/production/worker-1` or `/staging/vision-agent/step-3`.
- **Isolated Volumes**: Keep your environments completely separate using "Volumes." Each volume is its own independent workspace with a human-readable identity.

---

## Perfect For...

- **AI Agents**: Watch an agent's "chain of thought" and get notified when it moves between tasks.
- **Human-in-the-Loop**: Get a push notification the moment a background process reaches a step that requires manual input or review.
- **Background Jobs**: Monitor scheduled tasks and see their progress in real-time.
- **CI/CD Pipelines**: Track builds and deployments, receiving a push notification the moment a stage starts or finishes.
