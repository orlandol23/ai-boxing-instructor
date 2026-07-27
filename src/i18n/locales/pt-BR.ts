/**
 * Brazilian Portuguese resource bundle.
 *
 * Must stay key-for-key identical to `./en.ts` — the parity test in
 * `src/i18n/__tests__/locales.test.ts` fails the build on drift, in either
 * direction, and also checks that `{{placeholders}}` match per key.
 *
 * Theme axis: base key = `adult` skin, `_kids` suffix = Arcade Royale skin.
 */
const ptBR = {
  app: {
    name: 'Boxing AI',
  },

  language: {
    en: 'Inglês',
    ptBR: 'Português (Brasil)',
    switchTo: 'Mudar idioma para {{language}}',
    label: 'Idioma',
  },

  header: {
    back: 'Voltar',
    settings: 'Configurações',
    switchProfile: 'Trocar de perfil (ativo: {{name}})',
  },

  home: {
    tagline: 'Seu instrutor virtual de boxe',
    tagline_kids: 'Sua arena arcade de boxe',
    greeting: 'E aí, {{name}} — pronto para treinar?',
    greeting_kids: 'Olá, {{name}}! Pronta para a aventura de hoje?',
    streakDaysOne: 'dia seguido',
    streakDaysOther: 'dias seguidos',
    quests: 'Missões',
    viewProgress: 'Ver progresso',
    startTraining: 'Iniciar treino',
    modeShadowTitle: 'Shadow',
    modeShadowDescription: 'Treino livre',
    modeTechniqueTitle: 'Técnica',
    modeTechniqueDescription: 'Em breve',
    setupHint: 'Posicione o celular num tripé a ~2m de distância',
    questsAllDone: 'Missões de hoje completas — volte amanhã para 3 novas!',
    questsAllDone_kids:
      'O reino está a salvo por hoje — volte amanhã para 3 novas aventuras!',
  },

  profiles: {
    title: 'Quem vai treinar?',
    subtitle: 'Cada perfil tem seu próprio nível, histórico e tema.',
    newProfile: 'Novo perfil',
    createProfile: 'Criar perfil',
    editProfile: 'Editar perfil',
    editProfileNamed: 'Editar perfil {{name}}',
    trainAs: 'Treinar como {{name}}',
    trainAsKid: 'Treinar como {{name}} (modo kids)',
    name: 'Nome',
    namePlaceholder: 'Como te chamamos no ringue?',
    avatar: 'Avatar',
    avatarOption: 'Avatar {{emoji}}',
    kidsMode: 'Modo kids 👑',
    kidsModeHint: 'Tema Arcade Royale + missões em modo aventura',
    save: 'Salvar',
    createAndTrain: 'Criar e treinar',
    cancel: 'Cancelar',
    delete: 'Excluir perfil',
    deleteConfirm: 'Tocar de novo para confirmar exclusão',
    deleteHint:
      'Excluir o perfil não apaga o histórico de treinos salvo neste aparelho — ele apenas deixa de aparecer.',
  },

  progress: {
    total: 'Total',
    nextQuest: 'Próxima missão',
    questsToday: '{{done}}/{{total}} hoje',
    achievements: 'Conquistas',
    weeklyTitle: 'Últimos 7 dias · score médio',
    xpBarLabel: 'Progresso de XP no nível',
  },

  weekday: {
    sun: 'DOM',
    mon: 'SEG',
    tue: 'TER',
    wed: 'QUA',
    thu: 'QUI',
    fri: 'SEX',
    sat: 'SÁB',
  },

  quest: {
    done: 'concluída',
    xp: '+{{xp}} XP',
  },

  quests: {
    jabs_good_30: {
      description: '30 jabs bons',
      description_kids: 'Flechas certeiras: acerte 30 jabs caprichados',
    },
    crosses_good_20: {
      description: '20 crosses bons',
      description_kids: 'Golpe do dragão: 20 crosses caprichados',
    },
    hooks_20: {
      description: '20 hooks (qualquer mão)',
      description_kids: 'Giro real: 20 hooks (qualquer mão)',
    },
    punches_100: {
      description: '100 golpes no dia',
      description_kids: 'Invasão ao castelo: 100 golpes no dia',
    },
    good_punches_50: {
      description: '50 golpes bons no dia',
      description_kids: 'Tesouro do reino: 50 golpes caprichados no dia',
    },
    rounds_3: {
      description: 'Complete 3 rounds',
      description_kids: 'Jornada da coroa: complete 3 rounds',
    },
    guard_80_round: {
      description: 'Feche um round com guarda média ≥ 80',
      description_kids: 'Defenda o castelo: guarda ≥ 80 no round',
    },
    base_80_round: {
      description: 'Feche um round com base média ≥ 80',
      description_kids: 'Raízes de pedra: base ≥ 80 no round',
    },
  },

  badges: {
    locked: 'Bloqueada — {{description}}',
    first_session: {
      name: 'Primeira Sessão',
      name_kids: 'Primeira Aventura',
      description: 'Complete seu primeiro treino',
    },
    punches_100: {
      name: '100 Golpes',
      description: 'Acumule 100 golpes no total',
    },
    punches_1000: {
      name: '1000 Golpes',
      description: 'Acumule 1000 golpes no total',
    },
    iron_guard: {
      name: 'Guarda de Ferro',
      name_kids: 'Escudo do Castelo',
      description: 'Guarda média ≥ 90 numa sessão',
    },
    perfect_session: {
      name: 'Sessão Perfeita',
      name_kids: 'Round Encantado',
      description: 'Um round com guarda e base ≥ 90',
    },
    streak_7: {
      name: '7 Dias Seguidos',
      name_kids: 'Chama de 7 Dias',
      description: 'Treine 7 dias consecutivos',
    },
    streak_30: {
      name: '30 Dias Seguidos',
      name_kids: 'Chama de 30 Dias',
      description: 'Treine 30 dias consecutivos',
    },
    full_arsenal: {
      name: 'Arsenal Completo',
      name_kids: 'Arsenal Real',
      description: 'Acerte os 6 tipos de golpe numa mesma sessão',
    },
  },

  ranks: {
    bronze: 'Cinturão Bronze',
    bronze_kids: 'Coroa de Bronze',
    silver: 'Cinturão Prata',
    silver_kids: 'Coroa de Prata',
    gold: 'Cinturão Ouro',
    gold_kids: 'Coroa de Ouro',
    champion: 'Campeão',
    champion_kids: 'Rainha do Ringue',
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
    good: 'Bom',
    fair: 'Ok',
    poor: 'Fraco',
  },

  training: {
    round: 'Round {{number}}',
    startTraining: 'Iniciar treino',
    endRound: 'Encerrar round',
    finish: 'Finalizar',
    punches: 'golpes',
    guard: 'Guarda',
    base: 'Base',
    voiceOn: 'Coach de voz ativo',
    voiceSpeaking: 'Coach de voz ativo, falando',
    voiceOff: 'Coach de voz desativado',
  },

  stance: {
    orthodox: 'Ortodoxa',
    southpaw: 'Canhota',
  },

  camera: {
    switch: 'Alternar câmera',
    error: {
      generic: 'Não foi possível acessar a câmera.',
      insecureContext:
        'Não foi possível acessar a câmera porque a conexão não é segura. Acesse via HTTPS ou localhost.',
      permissionDenied: 'Permissão de câmera negada. Habilite nas configurações do navegador.',
      notFound: 'Nenhuma câmera foi encontrada neste dispositivo.',
      inUse: 'Câmera em uso por outro aplicativo. Feche e tente novamente.',
      overconstrained: 'Configurações de câmera não suportadas. Recarregue a página.',
    },
  },

  status: {
    cameraBlocked: 'Câmera bloqueada',
    startFailed: 'Não foi possível iniciar',
    retry: 'Tentar de novo',
    loadingModel: 'Carregando modelo...',
    stepIntoFrame: 'Entre no enquadramento da câmera',
    modelLoadError: 'Erro ao carregar modelo de pose: {{detail}}',
    detectionError: 'Erro na detecção de pose: {{detail}}',
  },

  coach: {
    title: 'Coach IA',
    loadingRound: 'Coach analisando o round...',
    loadingSession: 'Coach analisando seu treino...',
    unavailableRound: 'Coach IA indisponível agora — segue o treino!',
    unavailableSession: 'Coach IA indisponível — confira as métricas acima.',
  },

  summary: {
    title: 'Sessão concluída',
    roundsOne: 'round',
    roundsOther: 'rounds',
    duration: '{{minutes}}min {{seconds}}s',
    mode: 'shadow boxing',
    xpPunches: 'golpes',
    xpRoundBonus: 'bônus de round',
    xpQuests: 'missões',
    levelUp: 'Subiu de nível! LVL {{from}} → {{to}}',
    guard: 'Guarda',
    base: 'Base',
    punches: 'Golpes',
    punchDistribution: 'Distribuição de golpes',
    workOn: 'Pontos para trabalhar',
    highlights: 'Destaques',
    newBadgeOne: 'Nova conquista',
    newBadgeOther: 'Novas conquistas',
    todaysQuests: 'Missões de hoje',
    trainAgain: 'Treinar de novo',
    home: 'Início',
  },

  error: {
    title: 'Ops, algo deu errado',
    message:
      'Encontramos um problema inesperado durante o treino. Recarregue a página para continuar — seu progresso de hoje não some, é só recomeçar o round.',
    reload: 'Recarregar',
    gloveAlt: 'Luva de boxe',
  },

  coaching: {
    guard: {
      critical: {
        raiseGuard: 'Levanta a guarda!',
        protectFace: 'Protege o rosto!',
        handsOnChin: 'Mãos no queixo!',
      },
      handHeight: {
        handsHigher: 'Mãos mais altas, protege o rosto!',
        keepHandsUp: 'Mantém as mãos altas',
        guardDropping: 'Guarda tá caindo um pouco',
      },
      elbowTuck: {
        elbowsIn: 'Cotovelos junto ao corpo!',
        tuckElbows: 'Cola os cotovelos!',
      },
      chinTuck: {
        chinDown: 'Abaixa o queixo!',
        protectChin: 'Protege o queixo!',
      },
    },
    base: {
      critical: {
        fixBase: 'Corrige a base!',
        adjustFeet: 'Ajusta a posição dos pés!',
      },
      footWidth: {
        widerStance: 'Abre mais os pés!',
        shoulderWidth: 'Pés na largura dos ombros!',
      },
      kneeFlex: {
        bendKnees: 'Flexiona os joelhos!',
        moreKneeBend: 'Dobra mais os joelhos!',
      },
      weight: {
        distributeWeight: 'Distribui o peso melhor!',
        balanceWeight: 'Equilibra o peso entre os pés!',
      },
    },
    punch: {
      good: {
        goodPunch: 'Bom golpe!',
        niceOne: 'Mandou bem!',
        solidShot: 'Golpe firme!',
      },
      fair: {
        snapItBack: 'Retorna a mão mais rápido',
        handBackFaster: 'Traz a mão de volta!',
      },
      poor: {
        extendMore: 'Estende mais o braço!',
        rotateHips: 'Gira mais o quadril!',
      },
    },
    form: {
      excellent: {
        greatPosture: 'Postura excelente, continua assim!',
        doingGreat: 'Tá mandando bem!',
        goodRhythm: 'Ritmo bom, continua!',
      },
    },
  },

  notes: {
    correction: {
      generic: '{{rule}} ({{count}}x)',
      guardCritical: 'Guarda baixa em momentos críticos ({{count}}x)',
      guardHandHeight: 'Mãos caíram da altura ideal ({{count}}x)',
      guardElbowTuck: 'Cotovelos abertos com frequência ({{count}}x)',
      guardChinTuck: 'Queixo exposto recorrentemente ({{count}}x)',
      baseCritical: 'Base fraca em momentos críticos ({{count}}x)',
      baseFootWidth: 'Pés fechados demais ({{count}}x)',
      baseKneeFlex: 'Joelhos travados ou pouco flexionados ({{count}}x)',
      baseWeight: 'Distribuição de peso desbalanceada ({{count}}x)',
      punchFair: 'Retorno da mão à guarda lento ({{count}}x)',
      punchPoor: 'Extensão de braço ou rotação insuficiente ({{count}}x)',
    },
    highlight: {
      highScoreStreak: 'Round {{round}}: {{seconds}}s seguidos com guarda e base acima de 85',
      goodPunches: 'Round {{round}}: {{count}} golpes de boa qualidade',
    },
  },
} as const;

export default ptBR;
