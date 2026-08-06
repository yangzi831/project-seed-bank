# Bloom

### An AI garden where your ideas grow.

**Bloom** (formerly **Project Seed Bank**) is an AI-powered creative garden where ideas are treated as living organisms. Users can capture, grow, and revisit ideas through digital plants, immersive garden spaces, and an AI Garden Keeper.

Bloom is not designed around tasks waiting to be completed. It offers a gentler creative model: ideas can be preserved, accompanied, transformed, paused, and rediscovered in their own time.

> Public preview: [yangzi831.github.io/project-seed-bank](https://yangzi831.github.io/project-seed-bank/)
> The public build may temporarily lag behind the latest repository demo.

## Why Bloom

Most productivity software turns an idea into a task, a ticket, or a deadline. This is useful for execution, but it often loses the emotional and exploratory nature of creativity.

Bloom asks a different question:

**What if an idea were something alive?**

In Bloom, an idea becomes a digital plant. It can grow quickly, remain unfinished, enter dormancy, form new connections, or return after being forgotten. AI is not positioned as a replacement for the creator. It becomes a quiet companion that helps the user notice what is already emerging.

The result is an experiment in creative AI, digital life, and long-term human–AI relationships.

## Core Experience

### 1. Digital Idea Garden

Every idea planted in Bloom receives a digital living form.

- Ideas become visual plants instead of task cards.
- Different ideas can inhabit different plant forms.
- Growth is expressed through four stages:
  - **Growing** — the idea is actively developing.
  - **Forming** — its direction or expression is becoming clearer.
  - **Dormant** — the idea is resting without being discarded.
  - **Harvested** — the idea has formed a work, outcome, or meaningful trace.

These stages describe creative rhythms rather than productivity scores.

### 2. Garden Ecosystem

Ideas can live across five Garden Zones, each representing a different creative condition and way of thinking:

- **Inspiration Garden** — expressive, aesthetic, and emotionally driven ideas.
- **Water Mirror Garden** — reflection, memory, observation, and slow thinking.
- **Exhibition Garden** — ideas that are forming into works or public expressions.
- **Forest Garden** — systems, archives, connected knowledge, and long-term growth.
- **Experimental Garden** — uncertain directions, prototypes, mutations, and playful tests.

The zones create a spatial memory of the user's creative life. Organizing ideas becomes an act of placing and caring, not filing and managing.

### 3. Plant Library

Bloom includes a visual library of **24 digital plant assets**.

- Each plant has its own silhouette, atmosphere, and growth expression.
- Plants visually communicate the life state of an idea.
- A plant is not a category label; it is the idea's body inside Bloom.

The library explores how digital organisms can become an intuitive interface for personal creativity.

### 4. AI Garden Keeper

The AI Garden Keeper is a companion Agent that lives inside the garden rather than appearing as a conventional chatbot.

It can help users:

- Organize fragmented thoughts.
- Discover possible relationships and directions.
- Reflect on long-term growth traces.
- Revisit ideas that have entered dormancy.
- Turn a vague intention into a clearer creative starting point.

Different Keeper personalities offer different styles of companionship, from gentle preservation and reflection to experimentation and forward movement.

The current demo combines structured Agent flows, contextual garden data, designed demo conversations, and provider-compatible AI integration with safe fallback behavior.

### 5. Multimodal Idea Input

Bloom is designed to let ideas begin as fragments rather than polished descriptions.

The **Drop a Fragment** prototype presents a future multimodal path for:

- Text
- Image
- Audio
- Video
- Files

A fragment can be observed by the Garden Keeper and translated into a suggested idea name, description, Garden Zone, and plant form before the user chooses to plant it.

The current version implements the interaction prototype and presentation layer. Full multimodal inference and production file processing remain future extensions.

### 6. Idea Universe

The latest Bloom exploration expands a single plant into its own **Idea Universe**.

Instead of opening another information dashboard, the user enters an internal creative space containing:

- Idea story
- Growth traces
- Visual fragments
- Creative process records
- Garden Keeper reflections
- Future works and outputs

The current prototype is built for **Luminous Bloom**, a particle-based digital plant that exists as a structured 3D organism and rotates through a complete spatial view. Its surrounding records appear as scattered fragments inside a quiet content universe.

Idea Universe explores a future in which every idea can become an inhabitable creative world.

## Architecture

### Frontend

- React
- TypeScript
- Vite
- Interactive garden and zone interfaces
- Responsive spatial layouts
- Local-first demo state with compatibility for the project's existing cloud integration

### AI Layer

- AI Garden Keeper Agent product layer
- Shared Agent request, context, response, and suggestion structures
- Context assembled from the current idea, garden, growth journal, outputs, and Keeper personality
- Provider-compatible AI service layer
- Designed mock and demo fallbacks for stable presentation
- Architecture prepared for future multimodal understanding

### Visualization

- 24 original digital plant assets
- Immersive garden scenes
- Three.js particle-based digital plant experiments
- Layered stars, light traces, orbital motion, and spatial content fragments
- A foundation for future interactive 3D creative environments

## AMD / GPU Adaptation

Bloom is designed for AI-native creative workflows where visual computing and local intelligence can become part of everyday ideation.

AMD Radeon GPU acceleration can support:

- **Local multimodal AI inference** — privately interpreting text, images, sound, video, and creative files on the user's device.
- **Faster creative generation workflows** — reducing iteration time between an early fragment and a visible creative direction.
- **Real-time particle visualization** — rendering denser, more expressive digital organisms and responsive garden environments.
- **Future interactive 3D worlds** — enabling each idea to expand into a navigable spatial environment with generative visual behavior.

This creates an opportunity to connect local AI inference, real-time graphics, and personal creative memory in one continuous experience.

## Demo Flow

The AMD Hackathon demo follows this journey:

1. **Enter Bloom Garden**
   See a personal creative landscape where ideas live as plants.

2. **Explore Different Garden Zones**
   Move through spatial environments representing different modes of thinking.

3. **Browse the Plant Library**
   Discover 24 possible living forms for ideas.

4. **Choose an AI Garden Keeper**
   Select a digital companion with a distinct personality and visual identity.

5. **Create a New Idea Through Multimodal Input**
   Drop a fragment and preview how the Keeper may transform it into a plantable idea.

6. **Explore an Idea Universe**
   Enter Luminous Bloom and experience an idea as a particle-based digital organism surrounded by its own creative traces.

## Run the Demo Locally

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/garden
```

Create a production build with:

```bash
npm run build
```

## Current Prototype Scope

The repository currently demonstrates:

- A complete interactive idea garden and five spatial zones
- Idea planting, growth stages, journals, outcomes, and plant replacement
- A 24-plant visual library
- Six Garden Keeper character identities
- Garden-aware Agent interactions with demo fallback conversations
- A multimodal idea-input experience prototype
- A single-plant Idea Universe experiment
- A structured 3D particle sculpture for Luminous Bloom

The prototype intentionally focuses on experience, interaction language, and visual direction. Production-scale multimodal processing, a generalized universe for every plant, and GPU-optimized rendering remain future work.

## Future Vision

Bloom aims to build a bridge between AI, creativity, and everyday life.

Its long-term vision is not limited to professional creators. Bloom imagines a creative environment where anyone can preserve an unfinished thought, recognize patterns across years of personal exploration, and experience ideas through interactive digital life.

AI becomes a companion that helps people remain in relationship with their own imagination. The garden becomes a living archive—not only of what was completed, but of everything that was once worth growing.
