// Central, frozen game constants. Nothing else should hard-code these values.
export const CONFIG = Object.freeze({
  NAME: 'Undying Earth',
  VERSION: '0.0.2',
  SAVE_KEY: 'ue_save',
  SAVE_VERSION: 1,
  MAX_SAVE_BYTES: 200_000,
  // Not a secret: client-side code is visible to players. Used only to catch
  // accidental corruption and casual save edits.
  SAVE_SALT: 'ue-v1-integrity',
  MAX_BASES: 20,
  MAX_SURVIVORS: 500,
  MAX_NAME_LENGTH: 24,

  // Display: the game is drawn at a small fixed height and scaled up by whole
  // numbers, so pixel art stays sharp on every screen.
  VIRTUAL_HEIGHT: 270,

  // Day/night lengths (used from the day/night system onward)
  DAY_MINUTES: 10,
  NIGHT_MINUTES: 8,
});
