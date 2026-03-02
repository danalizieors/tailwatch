# Tailwatch

Tailwatch is a live event monitor designed for one simple purpose: to answer the question **"What is happening in my system right now?"**

It sits in the sweet spot between messy, overwhelming logs and complex, heavy monitoring tools. It provides a clean, real-time status for your AI agents, background workers, and distributed services.

## The Vision: Instant Clarity

When running complex systems—like multi-step AI agents, long-running deployment pipelines, or a fleet of background workers—it's easy to lose the thread. You know something is happening, but is it *stuck*? Is it *busy*? Or is it *idle*?

Tailwatch transforms a stream of raw data into a living **Status Board**. Instead of tailing logs and searching for specific markers, you glance at the board to see the state of every component at once.

## Stay Informed Everywhere

One of Tailwatch's most powerful features is its **native push notification system**. You don't need to keep the dashboard open to know when something goes wrong or a critical task finishes.

- **Cross-Platform Alerts**: Receive instant push notifications on your desktop, tablet, or phone.
- **State-Triggered Notifications**: Get notified the moment a process switches to an `error` state or exceeds its expected `busy` duration.
- **Mobile-First Design**: Install Tailwatch as a PWA on your mobile device to get a native-app experience with reliable background alerts.

## The Two Essential Views

Tailwatch provides two complementary views that work together to show you the full picture.

### 1. The Status Board (The "Now" View)
A live snapshot of your entire system's health.
- **Identify Stalls**: Spot jobs that have been "busy" for longer than expected.
- **Visualize Flow**: Watch as different components switch from idle to busy in a coordinated sequence.
- **Second-Monitor Ready**: A high-level dashboard designed to be kept open and visible.

### 2. The Log Stream (The "Timeline" View)
A real-time feed of every message as it arrives.
- **Watch the Thinking**: Follow the step-by-step logic of an AI agent or a build script.
- **Contextual Details**: See the specific messages or errors associated with a state change.
- **Coordinated Tracking**: Color-coded paths make it easy to follow multiple interleaved streams.

## The Conceptual Model

Tailwatch is built on three core ideas that make monitoring feel natural:

- **The Busy/Idle State Machine**: Every event in Tailwatch is either `busy` or `idle`. This binary status tells you instantly if a job is actively working or if it has reached a resting state. It’s the simplest possible heartbeat for any process.
- **Hierarchical Paths**: Organize your systems using a familiar, file-system-like structure. Group events under paths like `/production/worker-1` or `/staging/vision-agent/step-3`.
- **Isolated Volumes**: Keep your environments completely separate using "Volumes." Each volume is its own independent workspace with a human-readable identity.

---

## Perfect For...

*   **AI Agents**: Watch an agent's "chain of thought" and get notified when it hits a roadblock.
*   **Background Jobs**: Monitor scheduled tasks and get alerts if a backup fails.
*   **CI/CD Pipelines**: Track builds and deployments, receiving a push notification the moment production is live.
*   **Distributed Systems**: A lightweight way to see if remote services are still "breathing" across all your devices.
