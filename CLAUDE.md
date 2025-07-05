# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based vocabulary learning application designed to help students prepare for the 11+ exam. The app features two main learning modes:

1. **Revision Mode**: Flashcard-style learning with vocabulary words, definitions, and images
2. **Quiz Mode**: Multiple-choice questions to test knowledge

The application loads vocabulary from a CSV file and includes 426 vocabulary words with corresponding images.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture

### Core Structure
- **Next.js 15** with App Router and React 19
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Static site generation** configured for GitHub Pages deployment

### Key Components
- `src/app/page.tsx` - Main application with mode switching logic
- `src/components/RevisionMode.tsx` - Flashcard interface for studying
- `src/components/QuizMode.tsx` - Quiz interface with scoring
- `src/utils/vocabulary.ts` - Data loading and quiz generation utilities
- `src/types/vocabulary.ts` - TypeScript interfaces

### Data Flow
1. **CSV Loading**: Vocabulary loads from `public/vocabulary.csv` on app start
2. **Image Loading**: Images are checked lazily using HEAD requests to `/images/{word}.jpg`
3. **Quiz Generation**: Random questions generated with 3 wrong answers per question
4. **State Management**: React state for mode switching, progress tracking, and UI state

### Configuration Details
- **GitHub Pages**: Configured with `basePath` and `assetPrefix` for production deployment
- **Image Optimization**: Disabled for static export compatibility
- **CSV Parsing**: Custom parser handles quoted strings and commas in definitions

## Testing

No test framework is currently configured. When adding tests, recommend:
- Jest + React Testing Library for component tests
- Integration tests for vocabulary loading and quiz generation
- E2E tests for user workflows

## Image Management

Images are stored in `public/images/` with naming convention `{word}.jpg`. The app:
- Checks image existence dynamically using HEAD requests
- Loads images on-demand to optimize performance
- Handles missing images gracefully

## Development Notes

- The app uses client-side rendering exclusively (`'use client'`)
- Vocabulary data is loaded once on app startup
- Quiz questions are randomly generated from the vocabulary pool
- All navigation is handled client-side without Next.js routing