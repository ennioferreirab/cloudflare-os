export const SCHEDULER_LOCALES = ['en', 'pt-BR'] as const;

export type SchedulerLocale = typeof SCHEDULER_LOCALES[number];

type StarterId = 'daily' | 'weekly' | 'followUp' | 'metrics';

export type SchedulerCopy = {
  pageTitle: string;
  pageDescription: string;
  createSchedule: string;
  createSchedulePrompt: string;
  searchLabel: string;
  searchPlaceholder: string;
  statusLabel: string;
  filters: Record<'all' | 'active' | 'dead' | 'finished', string>;
  loading: string;
  loadFailed: string;
  tryAgain: string;
  noMatches: string;
  loadingMore: string;
  loadMore: string;
  getStarted: string;
  unavailableWorkspace: string;
  showDiagnostic: (title: string) => string;
  hideDiagnostic: (title: string) => string;
  errorTitle: string;
  reload: string;
  starters: ReadonlyArray<{
    id: StarterId;
    title: string;
    cadence: string;
    description: string;
    prompt: string;
  }>;
};

const COPY: Record<SchedulerLocale, SchedulerCopy> = {
  en: {
    pageTitle: 'Scheduled tasks',
    pageDescription: 'Wake a workspace and run its code on a schedule you choose.',
    createSchedule: 'Create schedule',
    createSchedulePrompt: 'Help me create a scheduled task. Ask me what it should do, which workspace and resources it should use, when it should run, and which timezone to use. Then set up the schedule.',
    searchLabel: 'Search scheduled tasks',
    searchPlaceholder: 'Search scheduled tasks…',
    statusLabel: 'Schedule status',
    filters: { all: 'All', active: 'Active', dead: 'Needs attention', finished: 'Finished' },
    loading: 'Loading scheduled tasks…',
    loadFailed: 'Couldn’t load scheduled tasks.',
    tryAgain: 'Try again',
    noMatches: 'No scheduled tasks match these filters.',
    loadingMore: 'Loading…',
    loadMore: 'Load more',
    getStarted: 'Get started',
    unavailableWorkspace: 'Unavailable workspace',
    showDiagnostic: title => `Show why ${title} needs attention`,
    hideDiagnostic: title => `Hide why ${title} needs attention`,
    errorTitle: 'Something went wrong',
    reload: 'Reload',
    starters: [
      {
        id: 'daily',
        title: 'Daily brief',
        cadence: 'Weekdays at 8:00 AM',
        description: 'Your calendar for the day plus the unread mail that needs a reply',
        prompt: 'Every weekday at 8:00 AM, send me a short brief of my calendar for the day and the unread email that needs a reply. Ask me which calendar and mailbox to use and which timezone to use, then set up the schedule.',
      },
      {
        id: 'weekly',
        title: 'Weekly roundup',
        cadence: 'Fridays at 4:00 PM',
        description: 'Turn the week’s Linear issues and GitHub pull requests into a status update',
        prompt: 'Every Friday at 4:00 PM, turn this week’s Linear issues and GitHub pull requests into a status update. Ask me which Linear team, GitHub repositories, and timezone to use, then set up the schedule.',
      },
      {
        id: 'followUp',
        title: 'Follow-up monitor',
        cadence: 'Weekdays at 9:00 AM',
        description: 'Flag the Gmail threads that are waiting on your reply',
        prompt: 'Every weekday at 9:00 AM, flag the Gmail threads that are waiting on my reply. Ask me which mailbox, destination, and timezone to use, then set up the schedule.',
      },
      {
        id: 'metrics',
        title: 'Metrics snapshot',
        cadence: 'Mondays at 8:00 AM',
        description: 'Refresh a spreadsheet or query and call out what moved',
        prompt: 'Every Monday at 8:00 AM, refresh a spreadsheet or query and call out what moved. Ask me which data source, destination, and timezone to use, then set up the schedule.',
      },
    ],
  },
  'pt-BR': {
    pageTitle: 'Tarefas agendadas',
    pageDescription: 'Execute o código de um espaço de trabalho no agendamento que você escolher.',
    createSchedule: 'Criar agendamento',
    createSchedulePrompt: 'Ajude-me a criar uma tarefa agendada. Pergunte o que ela deve fazer, qual espaço de trabalho e quais recursos deve usar, quando deve ser executada e qual fuso horário usar. Depois, configure o agendamento.',
    searchLabel: 'Buscar tarefas agendadas',
    searchPlaceholder: 'Buscar tarefas agendadas…',
    statusLabel: 'Status do agendamento',
    filters: { all: 'Todas', active: 'Ativas', dead: 'Precisam de atenção', finished: 'Finalizadas' },
    loading: 'Carregando tarefas agendadas…',
    loadFailed: 'Não foi possível carregar as tarefas agendadas.',
    tryAgain: 'Tentar novamente',
    noMatches: 'Nenhuma tarefa agendada corresponde a estes filtros.',
    loadingMore: 'Carregando…',
    loadMore: 'Carregar mais',
    getStarted: 'Comece aqui',
    unavailableWorkspace: 'Espaço de trabalho indisponível',
    showDiagnostic: title => `Mostrar por que ${title} precisa de atenção`,
    hideDiagnostic: title => `Ocultar por que ${title} precisa de atenção`,
    errorTitle: 'Algo deu errado',
    reload: 'Recarregar',
    starters: [
      {
        id: 'daily',
        title: 'Resumo diário',
        cadence: 'Dias úteis às 8h',
        description: 'Sua agenda do dia e os e-mails não lidos que precisam de resposta',
        prompt: 'Em todos os dias úteis, às 8h, envie um resumo curto da minha agenda do dia e dos e-mails não lidos que precisam de resposta. Pergunte qual calendário, qual caixa de correio e qual fuso horário usar. Depois, configure o agendamento.',
      },
      {
        id: 'weekly',
        title: 'Resumo semanal',
        cadence: 'Sextas-feiras às 16h',
        description: 'Transforme as issues do Linear e os pull requests do GitHub em uma atualização',
        prompt: 'Toda sexta-feira, às 16h, transforme as issues do Linear e os pull requests do GitHub da semana em uma atualização de status. Pergunte qual time do Linear, quais repositórios do GitHub e qual fuso horário usar. Depois, configure o agendamento.',
      },
      {
        id: 'followUp',
        title: 'Monitor de pendências',
        cadence: 'Dias úteis às 9h',
        description: 'Sinalize as conversas do Gmail que aguardam sua resposta',
        prompt: 'Em todos os dias úteis, às 9h, sinalize as conversas do Gmail que aguardam minha resposta. Pergunte qual caixa de correio, qual destino e qual fuso horário usar. Depois, configure o agendamento.',
      },
      {
        id: 'metrics',
        title: 'Panorama de métricas',
        cadence: 'Segundas-feiras às 8h',
        description: 'Atualize uma planilha ou consulta e destaque o que mudou',
        prompt: 'Toda segunda-feira, às 8h, atualize uma planilha ou consulta e destaque o que mudou. Pergunte qual fonte de dados, qual destino e qual fuso horário usar. Depois, configure o agendamento.',
      },
    ],
  },
};

export function normalizeSchedulerLocale(locale: string): SchedulerLocale {
  return locale.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export function schedulerCopy(locale: SchedulerLocale): SchedulerCopy {
  return COPY[locale];
}

export function applySchedulerLocale(locale: SchedulerLocale): void {
  document.documentElement.lang = locale;
  document.title = COPY[locale].pageTitle;
}
