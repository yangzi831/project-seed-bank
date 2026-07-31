# Project Seed Bank

Project Seed Bank is a personal project garden where ideas, side projects, learning plans, and creative prototypes are planted as digital plants and cultivated over time.

Live demo: [https://yangzi831.github.io/project-seed-bank/](https://yangzi831.github.io/project-seed-bank/)

## Project Idea

Most project tools treat ideas as tasks, tickets, or database rows. Project Seed Bank explores a softer model: personal projects as living seeds.

Instead of asking whether an idea is finished or unfinished, the app lets a project move through a more natural rhythm:

- growing
- mature
- dormant
- harvested

The interface is built around a five-zone creative garden. Each zone carries a different kind of project energy: visual expression, reflection, exhibition, system-building, and experimentation. The goal is to make personal work feel observable, revisitable, and alive.

## Core Features

- **Garden Overview**  
  A full estate map with five clickable garden zones and visible project plants.

- **Five Garden Zones**  
  Each zone has its own large map, project plants, and quick navigation to other gardens.

- **Project Planting**  
  Add a project with a short description, garden zone, plant category, and selected plant variant.

- **Plant Library**  
  A fixed 24-plant visual atlas with growing and mature states.

- **Growth Dossier**  
  Each project has a detail modal for status, plant preview, logs, outcomes, and plant replacement.

- **Growth Logs**  
  Record progress notes over time.

- **Outcomes**  
  Save text, links, image links, or file path placeholders as project results.

- **Growth Board**  
  View projects by status: growing, mature, dormant, and harvested.

- **Local-first Demo Data**  
  Current data is stored in browser `localStorage`; no backend or account system is required.

## Screenshots

> Screenshots will be added as the visual layout stabilizes.

### Garden Overview

![Garden Overview screenshot placeholder](public/images/garden/overview.png)

### Garden Zone

_Screenshot placeholder: single Garden page with plants on the zone canvas._

### Plant Library

_Screenshot placeholder: 24-plant atlas showing mature and growing states._

### Project Growth Dossier

_Screenshot placeholder: project detail modal with plant preview, logs, and outcomes._

## Technology Stack

- Vite
- React
- TypeScript
- Plain CSS
- Browser `localStorage`
- GitHub Pages
- GitHub Actions

The project intentionally avoids a backend, login, AI API, UI component library, WebGL, and file upload in the current demo stage.

## Current Status

Project Seed Bank is currently a working frontend demo.

Completed:

- Garden overview and five garden zones
- Real plant PNG asset library
- Project creation, editing, deletion, and status updates
- Plant selection and replacement
- Project logs and outcome records
- Drag positioning for plants on maps
- Plants atlas page
- Growth board
- GitHub Pages deployment

Still evolving:

- Tablet and mobile layout polish
- Screenshot documentation
- More refined plant placement behavior
- Better long-term persistence model beyond localStorage
- AI and Agent features

## Future Plan: AI Agent Direction

The next phase will explore AI as a gentle garden keeper rather than a generic chatbot.

Planned directions:

- **Project Seed Assistant**  
  Turn a rough idea into a clear project seed with title, description, suggested garden, plant type, and first next steps.

- **Growth Log Summarizer**  
  Summarize progress logs, detect blockers, and suggest what to record next.

- **Status Recommendation**  
  Suggest whether a project should keep growing, become mature, go dormant, or be harvested.

- **Outcome Assistant**  
  Help transform logs and outcomes into portfolio blurbs, release notes, or showcase copy.

- **Weekly Garden Keeper Agent**  
  Review the garden periodically, ask what changed, and help maintain momentum.

- **Portfolio Harvest Agent**  
  When a project is harvested, help package it into screenshots, story, links, and a publish-ready case study.

The guiding principle: AI should support reflection and cultivation, not turn the garden into another productivity dashboard.
