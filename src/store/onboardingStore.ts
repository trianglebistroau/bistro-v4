"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getInitialOnboardingData, saveOnboardingData, ONBOARDING_DATA_KEY, ONBOARDING_DONE_KEY } from "@/utils/onboarding";

export type Screen = "name" | "content" | "character" | "pain" | "loading" | "summary";

interface OnboardingState {
  // Form data
  name: string;
  contentTypes: string[];
  character: number | null;
  painPoints: string;

  // Navigation
  currentScreen: Screen;
  isComplete: boolean;

  // UI state
  othersExpanded: boolean;
  othersText: string;

  // Actions - form data
  setName: (name: string) => void;
  addContentType: (type: string) => void;
  removeContentType: (type: string) => void;
  setCharacter: (index: number | null) => void;
  setPainPoints: (points: string) => void;

  // Actions - navigation
  advance: () => void;
  retreat: () => void;
  setScreen: (screen: Screen) => void;
  markComplete: () => void;

  // Actions - UI
  setOthersExpanded: (expanded: boolean) => void;
  setOthersText: (text: string) => void;

  // Derived state
  canAdvance: boolean;
  canRetreat: boolean;
}

const SCREEN_ORDER: Screen[] = ["name", "content", "character", "pain", "loading", "summary"];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => {
      // Initialize from existing localStorage data
      const initialData = getInitialOnboardingData();

      return {
        // Initial state
        name: initialData.name,
        contentTypes: initialData.dataLane,
        character: null,
        painPoints: initialData.challenge,
        currentScreen: "name",
        isComplete: false,
        othersExpanded: false,
        othersText: "",

        // Form data actions
        setName: (name) => {
          set({ name });
          get().syncToLocalStorage();
        },

        addContentType: (type) => {
          set((state) => ({ contentTypes: [...state.contentTypes, type] }));
          get().syncToLocalStorage();
        },

        removeContentType: (type) => {
          set((state) => ({ contentTypes: state.contentTypes.filter((t) => t !== type) }));
          get().syncToLocalStorage();
        },

        setCharacter: (index) => {
          set({ character: index });
          get().syncToLocalStorage();
        },

        setPainPoints: (points) => {
          set({ painPoints: points });
          get().syncToLocalStorage();
        },

        // Navigation actions
        advance: () => {
          const { currentScreen } = get();
          const idx = SCREEN_ORDER.indexOf(currentScreen);
          if (idx < SCREEN_ORDER.length - 1) {
            set({ currentScreen: SCREEN_ORDER[idx + 1] });
          }
        },

        retreat: () => {
          const { currentScreen } = get();
          const idx = SCREEN_ORDER.indexOf(currentScreen);
          if (idx > 0) {
            set({ currentScreen: SCREEN_ORDER[idx - 1] });
          }
        },

        setScreen: (screen) => {
          set({ currentScreen: screen });
        },

        markComplete: () => {
          set({ isComplete: true });
        },

        // UI actions
        setOthersExpanded: (expanded) => {
          set({ othersExpanded: expanded });
        },

        setOthersText: (text) => {
          set({ othersText: text });
        },

        // Derived state
        get canAdvance() {
          const { currentScreen, name, contentTypes, character, painPoints } = get();
          switch (currentScreen) {
            case "name":
              return name.trim().length > 0;
            case "content":
              return contentTypes.length > 0;
            case "character":
              return character !== null;
            case "pain":
              return painPoints.trim().length > 0;
            case "loading":
              return false;
            case "summary":
              return true;
            default:
              return false;
          }
        },

        get canRetreat() {
          const { currentScreen } = get();
          return currentScreen !== "name" && currentScreen !== "loading";
        },

        // Sync current state to legacy localStorage format
        syncToLocalStorage: () => {
          const { name, contentTypes, character, painPoints } = get();
          const characterRef = character !== null
            ? ["chef", "scholar", "explorer", "creator", "traveler"][character]
            : undefined;

          saveOnboardingData({
            name,
            dataLane: contentTypes,
            challenge: painPoints,
            character: characterRef,
          });
        },
      };
    },
    {
      name: "bistro-onboarding-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        name: state.name,
        contentTypes: state.contentTypes,
        character: state.character,
        painPoints: state.painPoints,
        isComplete: state.isComplete,
      }),
    },
  ),
);
