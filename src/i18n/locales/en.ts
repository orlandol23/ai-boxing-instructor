/**
 * English resource bundle (default language).
 *
 * Two axes live in this file:
 *  - **language** — one bundle per locale (`en`, `pt-BR`), bundled at build
 *    time so the PWA renders text with no network round-trip.
 *  - **theme** — the `adult` skin is the base key; the `kids` skin is the
 *    same key with the i18next context suffix `_kids`. A missing `_kids`
 *    entry silently falls back to the base (adult) copy, which is exactly
 *    the behaviour the kids skin has always had.
 *
 * `src/theme/copy.ts` is the only place that decides which theme suffix to
 * ask for; components never build the suffix by hand.
 */
const en = {
  app: {
    name: 'Boxing AI',
  },

  language: {
    en: 'English',
    ptBR: 'Portuguese (Brazil)',
    switchTo: 'Switch language to {{language}}',
    label: 'Language',
  },

  header: {
    back: 'Back',
    settings: 'Settings',
    switchProfile: 'Switch profile (active: {{name}})',
  },

  home: {
    tagline: 'Your virtual boxing instructor',
    tagline_kids: 'Your arcade boxing arena',
    greeting: 'Hey {{name}} — ready to train?',
    greeting_kids: 'Hi {{name}}! Ready for today’s adventure?',
    streakDaysOne: 'day streak',
    streakDaysOther: 'day streak',
    quests: 'Quests',
    viewProgress: 'View progress',
    startTraining: 'Start training',
    modeShadowTitle: 'Shadow',
    modeShadowDescription: 'Free training',
    modeTechniqueTitle: 'Technique',
    modeTechniqueDescription: 'Coming soon',
    setupHint: 'Prop your phone on a tripod about 2 m away',
    questsAllDone: 'Today’s quests are done — come back tomorrow for 3 new ones!',
    questsAllDone_kids:
      'The kingdom is safe for today — come back tomorrow for 3 new adventures!',
  },

  profiles: {
    title: 'Who is training?',
    subtitle: 'Every profile has its own level, history and theme.',
    newProfile: 'New profile',
    createProfile: 'Create profile',
    editProfile: 'Edit profile',
    editProfileNamed: 'Edit profile {{name}}',
    trainAs: 'Train as {{name}}',
    trainAsKid: 'Train as {{name}} (kids mode)',
    name: 'Name',
    namePlaceholder: 'What should we call you in the ring?',
    avatar: 'Avatar',
    avatarOption: 'Avatar {{emoji}}',
    kidsMode: 'Kids mode 👑',
    kidsModeHint: 'Arcade Royale theme + quests in adventure mode',
    save: 'Save',
    createAndTrain: 'Create and train',
    cancel: 'Cancel',
    delete: 'Delete profile',
    deleteConfirm: 'Tap again to confirm deletion',
    deleteHint:
      'Deleting a profile does not erase the training history stored on this device — it only stops showing up.',
  },

  progress: {
    total: 'Total',
    nextQuest: 'Next quest',
    questsToday: '{{done}}/{{total}} today',
    achievements: 'Achievements',
    weeklyTitle: 'Last 7 days · average score',
    xpBarLabel: 'XP progress within the current level',
  },

  weekday: {
    sun: 'SUN',
    mon: 'MON',
    tue: 'TUE',
    wed: 'WED',
    thu: 'THU',
    fri: 'FRI',
    sat: 'SAT',
  },

  quest: {
    done: 'completed',
    xp: '+{{xp}} XP',
  },

  quests: {
    jabs_good_30: {
      description: '30 good jabs',
      description_kids: 'True arrows: land 30 crisp jabs',
    },
    crosses_good_20: {
      description: '20 good crosses',
      description_kids: 'Dragon strike: 20 crisp crosses',
    },
    hooks_20: {
      description: '20 hooks (either hand)',
      description_kids: 'Royal spin: 20 hooks (either hand)',
    },
    punches_100: {
      description: '100 punches today',
      description_kids: 'Castle raid: 100 punches today',
    },
    good_punches_50: {
      description: '50 good punches today',
      description_kids: 'Kingdom treasure: 50 crisp punches today',
    },
    rounds_3: {
      description: 'Complete 3 rounds',
      description_kids: 'Quest for the crown: complete 3 rounds',
    },
    guard_80_round: {
      description: 'Finish a round with average guard ≥ 80',
      description_kids: 'Defend the castle: guard ≥ 80 in a round',
    },
    base_80_round: {
      description: 'Finish a round with average base ≥ 80',
      description_kids: 'Roots of stone: base ≥ 80 in a round',
    },
  },

  badges: {
    locked: 'Locked — {{description}}',
    first_session: {
      name: 'First Session',
      name_kids: 'First Adventure',
      description: 'Complete your first workout',
    },
    punches_100: {
      name: '100 Punches',
      description: 'Land 100 punches in total',
    },
    punches_1000: {
      name: '1000 Punches',
      description: 'Land 1000 punches in total',
    },
    iron_guard: {
      name: 'Iron Guard',
      name_kids: 'Castle Shield',
      description: 'Average guard ≥ 90 in a session',
    },
    perfect_session: {
      name: 'Perfect Session',
      name_kids: 'Enchanted Round',
      description: 'A round with guard and base ≥ 90',
    },
    streak_7: {
      name: '7 Days in a Row',
      name_kids: '7-Day Flame',
      description: 'Train 7 days in a row',
    },
    streak_30: {
      name: '30 Days in a Row',
      name_kids: '30-Day Flame',
      description: 'Train 30 days in a row',
    },
    full_arsenal: {
      name: 'Full Arsenal',
      name_kids: 'Royal Arsenal',
      description: 'Land all 6 punch types in one session',
    },
  },

  ranks: {
    bronze: 'Bronze Belt',
    bronze_kids: 'Bronze Crown',
    silver: 'Silver Belt',
    silver_kids: 'Silver Crown',
    gold: 'Gold Belt',
    gold_kids: 'Gold Crown',
    champion: 'Champion',
    champion_kids: 'Ring Royalty',
  },

  punchType: {
    jab: 'Jab',
    cross: 'Cross',
    lead_hook: 'Lead Hook',
    rear_hook: 'Rear Hook',
    lead_uppercut: 'Lead Upper',
    rear_uppercut: 'Rear Upper',
  },

  quality: {
    good: 'Good',
    fair: 'Ok',
    poor: 'Weak',
  },

  training: {
    round: 'Round {{number}}',
    startTraining: 'Start training',
    endRound: 'End round',
    finish: 'Finish',
    punches: 'punches',
    guard: 'Guard',
    base: 'Base',
    voiceOn: 'Voice coach on',
    voiceSpeaking: 'Voice coach on, speaking',
    voiceOff: 'Voice coach off',
  },

  stance: {
    orthodox: 'Orthodox',
    southpaw: 'Southpaw',
  },

  camera: {
    switch: 'Switch camera',
    error: {
      generic: 'Could not access the camera.',
      insecureContext:
        'Could not access the camera because the connection is not secure. Open the app over HTTPS or on localhost.',
      permissionDenied: 'Camera permission denied. Enable it in your browser settings.',
      notFound: 'No camera was found on this device.',
      inUse: 'The camera is in use by another app. Close it and try again.',
      overconstrained: 'These camera settings are not supported. Reload the page.',
    },
  },

  status: {
    cameraBlocked: 'Camera blocked',
    startFailed: 'Could not start',
    retry: 'Try again',
    loadingModel: 'Loading model...',
    stepIntoFrame: 'Step into the camera frame',
    modelLoadError: 'Failed to load the pose model: {{detail}}',
    detectionError: 'Pose detection failed: {{detail}}',
  },

  coach: {
    title: 'AI Coach',
    loadingRound: 'Coach is reviewing the round...',
    loadingSession: 'Coach is reviewing your workout...',
    unavailableRound: 'AI coach is unavailable right now — keep training!',
    unavailableSession: 'AI coach is unavailable — check the metrics above.',
  },

  summary: {
    title: 'Session complete',
    roundsOne: 'round',
    roundsOther: 'rounds',
    duration: '{{minutes}}min {{seconds}}s',
    mode: 'shadow boxing',
    xpPunches: 'punches',
    xpRoundBonus: 'round bonus',
    xpQuests: 'quests',
    levelUp: 'Level up! LVL {{from}} → {{to}}',
    guard: 'Guard',
    base: 'Base',
    punches: 'Punches',
    punchDistribution: 'Punch breakdown',
    workOn: 'Points to work on',
    highlights: 'Highlights',
    newBadgeOne: 'New achievement',
    newBadgeOther: 'New achievements',
    todaysQuests: 'Today’s quests',
    trainAgain: 'Train again',
    home: 'Home',
  },

  error: {
    title: 'Oops, something went wrong',
    message:
      'We hit an unexpected problem during training. Reload the page to keep going — today’s progress is safe, you just restart the round.',
    reload: 'Reload',
    gloveAlt: 'Boxing glove',
  },

  /**
   * Voice-coach phrases. `src/engine/CoachingRules.ts` picks one of these
   * keys per rule; the engine never sees the text itself.
   */
  coaching: {
    guard: {
      critical: {
        raiseGuard: 'Hands up!',
        protectFace: 'Protect your face!',
        handsOnChin: 'Hands on your chin!',
      },
      handHeight: {
        handsHigher: 'Hands higher, protect your face!',
        keepHandsUp: 'Keep those hands up',
        guardDropping: 'Your guard is slipping',
      },
      elbowTuck: {
        elbowsIn: 'Elbows in tight!',
        tuckElbows: 'Tuck those elbows!',
      },
      chinTuck: {
        chinDown: 'Chin down!',
        protectChin: 'Protect your chin!',
      },
    },
    base: {
      critical: {
        fixBase: 'Fix your base!',
        adjustFeet: 'Adjust your footwork!',
      },
      footWidth: {
        widerStance: 'Widen your stance!',
        shoulderWidth: 'Feet shoulder-width apart!',
      },
      kneeFlex: {
        bendKnees: 'Bend your knees!',
        moreKneeBend: 'More bend in the knees!',
      },
      weight: {
        distributeWeight: 'Spread your weight better!',
        balanceWeight: 'Balance the weight between your feet!',
      },
    },
    punch: {
      good: {
        goodPunch: 'Good punch!',
        niceOne: 'Nice one!',
        solidShot: 'Solid shot!',
      },
      fair: {
        snapItBack: 'Snap that hand back faster',
        handBackFaster: 'Bring the hand back!',
      },
      poor: {
        extendMore: 'Extend the arm more!',
        rotateHips: 'Rotate those hips!',
      },
    },
    form: {
      excellent: {
        greatPosture: 'Great posture, keep it up!',
        doingGreat: 'You are doing great!',
        goodRhythm: 'Good rhythm, keep going!',
      },
    },
  },

  /**
   * Structured session notes. `SessionTracker` returns `{ key, params }`
   * pairs; the UI (and the AI-coach payload) renders them here.
   */
  notes: {
    correction: {
      generic: '{{rule}} ({{count}}x)',
      guardCritical: 'Guard dropped at critical moments ({{count}}x)',
      guardHandHeight: 'Hands fell below the ideal height ({{count}}x)',
      guardElbowTuck: 'Elbows flaring out often ({{count}}x)',
      guardChinTuck: 'Chin left exposed repeatedly ({{count}}x)',
      baseCritical: 'Weak base at critical moments ({{count}}x)',
      baseFootWidth: 'Feet too close together ({{count}}x)',
      baseKneeFlex: 'Knees locked or barely bent ({{count}}x)',
      baseWeight: 'Unbalanced weight distribution ({{count}}x)',
      punchFair: 'Slow hand return to the guard ({{count}}x)',
      punchPoor: 'Not enough arm extension or rotation ({{count}}x)',
    },
    highlight: {
      highScoreStreak: 'Round {{round}}: {{seconds}}s straight with guard and base above 85',
      goodPunches: 'Round {{round}}: {{count}} good-quality punches',
    },
  },
} as const;

export default en;
