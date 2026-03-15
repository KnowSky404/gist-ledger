export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

const localeTags = {
  zh: 'zh-CN',
  en: 'en-US',
} as const;

export const getIntlLocaleTag = (locale: Locale) => localeTags[locale];

const toDate = (value: Date | string) => (typeof value === 'string' ? new Date(value) : value);

const formatAmountForTag = (tag: string, value: number, fractionDigits = 2) => {
  return new Intl.NumberFormat(tag, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export const formatAmount = (locale: Locale, value: number, fractionDigits = 2) => {
  return formatAmountForTag(getIntlLocaleTag(locale), value, fractionDigits);
};

export const formatInteger = (locale: Locale, value: number) => {
  return new Intl.NumberFormat(getIntlLocaleTag(locale), { maximumFractionDigits: 0 }).format(value);
};

export const formatPercent = (locale: Locale, value: number, fractionDigits = 1) => {
  return `${new Intl.NumberFormat(getIntlLocaleTag(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
};

export const formatDisplayDate = (
  locale: Locale,
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  return new Intl.DateTimeFormat(getIntlLocaleTag(locale), options ?? { dateStyle: 'medium' }).format(toDate(value));
};

export const formatDisplayTime = (
  locale: Locale,
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
) => {
  return new Intl.DateTimeFormat(getIntlLocaleTag(locale), options ?? { timeStyle: 'short' }).format(toDate(value));
};

export const getPreferredLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  const saved = window.localStorage.getItem('gist_locale');
  if (saved === 'zh' || saved === 'en') {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export const categoryCatalog = {
  zh: {
    expense: ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '其他'],
    income: ['工资', '奖金', '投资', '兼职', '其他'],
  },
  en: {
    expense: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Housing', 'Medical', 'Education', 'Other'],
    income: ['Salary', 'Bonus', 'Investment', 'Freelance', 'Other'],
  },
} as const;

export const getDefaultCategories = (locale: Locale) => categoryCatalog[locale];

const buildCategoryAliasMap = () => {
  const aliasMap = {
    expense: new Map<string, number>(),
    income: new Map<string, number>(),
  };

  (['expense', 'income'] as const).forEach((type) => {
    categoryCatalog.zh[type].forEach((label, index) => {
      aliasMap[type].set(label.trim().toLowerCase(), index);
    });
    categoryCatalog.en[type].forEach((label, index) => {
      aliasMap[type].set(label.trim().toLowerCase(), index);
    });
  });

  return aliasMap;
};

const categoryAliasMap = buildCategoryAliasMap();

const getCategoryIndex = (type: 'expense' | 'income', value: string) => {
  const normalized = value.trim().toLowerCase();
  return categoryAliasMap[type].get(normalized);
};

export const localizeCategoryLabel = (
  value: string,
  type: 'expense' | 'income',
  locale: Locale,
) => {
  const index = getCategoryIndex(type, value);
  if (index === undefined) {
    return value.trim();
  }

  return categoryCatalog[locale][type][index];
};

export const normalizeKnownCategoryInput = (
  value: string,
  type: 'expense' | 'income',
  locale: Locale,
) => {
  const index = getCategoryIndex(type, value);
  if (index === undefined) {
    return value.trim();
  }

  return categoryCatalog[locale][type][index];
};

export const areCategoriesEquivalent = (
  left: string,
  right: string,
  type: 'expense' | 'income',
) => {
  const leftIndex = getCategoryIndex(type, left);
  const rightIndex = getCategoryIndex(type, right);

  if (leftIndex !== undefined && rightIndex !== undefined) {
    return leftIndex == rightIndex;
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase();
};

export const localeMeta = {
  zh: { short: '中', label: '中文' },
  en: { short: 'EN', label: 'English' },
} as const;

export const monthAxisLabels = {
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

export const formatMonthPeriod = (locale: Locale, year: number, month: number) => {
  return locale === 'zh' ? `${year}年 ${month}月` : `${monthAxisLabels.en[month - 1]} ${year}`;
};

export const formatYearPeriod = (locale: Locale, year: number) => {
  return locale === 'zh' ? `${year}年` : String(year);
};

export const formatYearAxisLabel = (locale: Locale, year: number) => {
  return locale === 'zh' ? `${year}年` : String(year);
};

export const formatDeltaLabel = (locale: Locale, current: number, previous: number) => {
  const difference = current - previous;

  if (previous === 0) {
    if (difference === 0) {
      return locale === 'zh' ? '持平' : 'Flat';
    }

    return difference > 0
      ? locale === 'zh' ? '新增' : 'New'
      : locale === 'zh' ? '下降' : 'Down';
  }

  const percent = (difference / previous) * 100;
  return `${percent > 0 ? '+' : ''}${formatPercent(locale, Math.abs(percent)).replace('%', '')}%`;
};

export const messages = {
  zh: {
    appName: '云笺账本',
    appSubtitle: '基于 GitHub Gist 的私有云账本',
    appTagline: '自有数据 · GitHub Gist · 响应式工作区',
    login: {
      tokenLabel: 'GitHub Token',
      tokenHint: '需要 `gist` 权限，Token 仅保存在本地浏览器。',
      connect: '连接数据库',
      connected: '已连接',
      syncing: '正在同步数据...',
      verifyingToken: '正在验证 Token...',
      greeting: (user: string) => `你好, ${user}! 正在查找 Gist 数据库...`,
      connectedDb: (id: string) => `连接成功! 数据库 ID: ${id}`,
      syncCompleted: (count: number) => `数据同步完成。当前记录数: ${count} 条`,
      connectFailed: '连接失败，请检查 Token 权限 (需要 gist 权限)',
      autoLoginFailed: '自动登录失败，请重新连接',
    },
    nav: {
      journal: '记账',
      history: '查询',
      stats: '统计',
      logout: '退出登录',
    },
    common: {
      saving: '保存中...',
      cancel: '取消',
      edit: '编辑',
      delete: '删除',
      expense: '支出',
      income: '收入',
      category: '分类',
      amount: '金额',
      date: '日期',
      notes: '备注',
      balance: '结余',
      languageToggle: '切换语言',
      themeSystem: '跟随系统',
      themeLight: '浅色',
      themeDark: '深色',
      themeToggle: '切换主题',
      start: '开始',
      end: '结束',
      all: '全部',
      none: '暂无',
      dash: '—',
      total: (value: number | string) => `总计: ${value}`,
      versusPrevious: (label: string) => `较上期 ${label}`,
    },
    dashboard: {
      syncStatus: '同步状态',
      statusIdle: '等待操作',
      statusSaving: '正在同步',
      statusSaved: '云端已同步',
      statusError: '同步失败',
      lastSynced: (time: string) => `最近同步 ${time}`,
      monthEntries: '本月记录',
      monthBalance: '本月结余',
      monthBudget: '月预算',
      budgetUnset: '尚未设置预算',
      budgetOver: (amount: number) => `本月超支 ${formatAmountForTag('zh-CN', amount)}`,
      budgetRemaining: (amount: number) => `预算剩余 ${formatAmountForTag('zh-CN', amount)}`,
      fixedTemplates: '固定模板',
      fixedTemplatesDesc: '可一键录入房租、订阅、工资等固定账单',
      fixedTemplatesPending: (count: number) => `其中 ${count} 个模板待处理`,
      fixedTemplatesAllClear: '本月模板都已处理完成',
      monthIncome: '本月收入',
      monthExpense: '本月支出',
      overviewTitle: '本月概览',
      overviewSubtitle: '快速查看当前财务状态和模板执行情况',
      recentRecords: '最近记录',
      viewAll: '查看全部',
      noRecords: '还没有记录，快记一笔吧！',
      showingRecent: (shown: number, total: number) => `显示最近 ${shown} 条 / 共 ${total} 条`,
    },
    toast: {
      syncRollback: '同步失败，已恢复到上一次成功状态',
      budgetRollback: '预算保存失败，已恢复到上一次成功状态',
      budgetSaved: '月预算已同步到 Gist',
      budgetCleared: '月预算已清除',
      newRecordSynced: '新记录已同步到 Gist',
      recordDeleted: '记录已删除并同步',
      recordUpdated: '修改已保存到 Gist',
      templateUpdated: '模板已更新',
      templateCreated: '模板已创建',
      templateDeleted: '模板已删除',
      templateRollback: '模板保存失败，已恢复到上一次成功状态',
      templateDeleteRollback: '模板删除失败，已恢复到上一次成功状态',
    },
    form: {
      titleNew: '记一笔',
      titleEdit: '编辑记录',
      autoSync: '自动同步到 Gist',
      categoryPlaceholder: '输入或选择分类',
      frequentCategories: '常用分类',
      quickDate: '快捷日期',
      today: '今天',
      yesterday: '昨天',
      monthStart: '月初',
      budgetWarning: '月预算预警',
      budgetLabel: (budget: number) => `预算 ${formatAmountForTag('zh-CN', budget)}`,
      expenseAfterSave: '保存后本月支出',
      remainingBudget: '预算剩余',
      projectedMonthExpense: '预计月末支出',
      notesPlaceholder: '备注点什么...',
      saveChanges: '保存修改',
      confirmEntry: '确认录入',
      overspentAfterSave: (amount: number) => `保存后将超出本月预算 ${formatAmountForTag('zh-CN', amount)}。`,
      dailyAllowanceTip: (amount: number) => `若继续按当前节奏消费，建议接下来日均控制在 ${formatAmountForTag('zh-CN', amount)} 以内。`,
      stillWithinBudget: '保存后仍在预算范围内。',
    },
    template: {
      generic: '通用模板',
      defaultDate: (date: string) => `默认日期：${date}`,
      recordedThisMonth: '本月已记',
      ledgerDay: (day: number) => `记账日：每月 ${day} 日`,
      dueEntry: '待入账',
      dueDate: (date: string) => `应记日期：${date}`,
      dueThisMonth: '本月待办',
      confirmDelete: '确定要删除这个模板吗？',
      title: '固定模板',
      subtitle: '适合房租、订阅、工资等常见固定账单',
      createNew: '新建模板',
      count: '模板数',
      due: '待入账',
      done: '本月已记',
      editTitle: '编辑模板',
      createTitle: '新建模板',
      namePlaceholder: '模板名称，如房租、工资',
      amountPlaceholder: '金额',
      expenseTemplate: '支出模板',
      incomeTemplate: '收入模板',
      categoryPlaceholder: '分类',
      schedulePlaceholder: '每月几号，留空则为通用模板',
      notesOptional: '备注（可选）',
      saveTemplate: '保存模板',
      createTemplate: '创建模板',
      empty: '还没有固定模板，先添加一个常用账单吧。',
      monthly: (day: number) => `每月 ${day} 日`,
      apply: '记一笔',
      remindersTitle: '模板提醒',
      remindersSubtitle: '自动追踪本月固定账单，避免漏记',
      dueSection: '待立即处理',
      upcomingSection: '稍后处理',
      allClear: '本月没有待处理的固定模板。',
      noUpcoming: '没有后续待办。',
      quickLog: '快速记账',
      dueCount: (count: number) => `待处理 ${count} 项`,
      upcomingCount: (count: number) => `即将到期 ${count} 项`,
    },
    history: {
      confirmDelete: '确定要删除这条记录吗？',
      filterTitle: '查询筛选',
      searchPlaceholder: '搜索分类或备注...',
      quickRange: '快捷时间',
      thisMonth: '本月',
      last30Days: '近30天',
      thisYear: '今年',
      allTime: '全部',
      filteredResult: '筛选结果',
      exportCsv: 'CSV',
      exportJson: 'JSON',
      clear: '清空',
      typeLabel: (value: string) => `类型：${value}`,
      keywordLabel: (value: string) => `关键词：${value}`,
      timeLabel: (start: string, end: string) => `时间：${start || '开始'} - ${end || '结束'}`,
      sortAdjusted: '排序已调整',
      noMatch: '没有找到符合条件的记录',
      page: (current: number, total: number) => `第 ${current} / ${total} 页`,
      dateHeader: '日期',
      categoryRemarkHeader: '分类 / 备注',
      typeHeader: '类型',
      amountHeader: '金额',
      actionHeader: '操作',
      sortDateDesc: '日期：最新在前',
      sortDateAsc: '日期：最早在前',
      sortAmountDesc: '金额：从大到小',
      sortAmountAsc: '金额：从小到大',
    },
    stats: {
      noData: '暂无数据',
      top: (count: number) => `Top ${count}`,
      noBreakdown: '暂无可展示的分类数据',
      monthView: '月度统计',
      yearView: '年度统计',
      period: '统计周期',
      filterCategories: '筛选分类',
      selectedCategories: (count: number) => `已选 ${count} 个分类`,
      backCurrent: '回到本期',
      filteredRecords: (count: number) => `当前筛选覆盖 ${count} 条记录`,
      chooseCategory: '选择分类',
      clearFilter: '清除筛选',
      noCategoryData: '暂无分类数据',
      monthIncome: '本月收入',
      yearIncome: '本年收入',
      monthExpense: '本月支出',
      yearExpense: '本年支出',
      monthBalance: '本月结余',
      yearBalance: '本年结余',
      activity: '活跃度',
      entries: (count: number) => `${count} 笔`,
      activeSummary: (days: number, categories: number) => `${days} 个活跃日 · ${categories} 个分类`,
      monthTrendTitle: (year: number) => `${year}年 月度趋势`,
      yearTrendTitle: '近5年 年度趋势',
      accumulateByMonth: '按月累计',
      accumulateByYear: '按年累计',
      incomeTrend: '收入趋势',
      expenseTrend: '支出趋势',
      insights: '关键洞察',
      savingsRate: '储蓄率',
      savingsRateHint: '结余 ÷ 收入',
      topExpense: '最大支出分类',
      noExpense: '当前周期暂无支出记录',
      topIncome: '最大收入分类',
      noIncome: '当前周期暂无收入记录',
      expenseBreakdown: '支出分类占比',
      incomeBreakdown: '收入分类占比',
      monthlyBudget: '月预算',
      setBudgetHint: '给自己设一个每月支出预算，后续会在录入时实时提醒是否即将超支。',
      setBudget: '设置月预算',
      editBudget: '编辑预算',
      clearBudget: '清除预算',
      modifyBudgetPlaceholder: '修改每月支出预算',
      setBudgetPlaceholder: '设置每月支出预算',
      saveBudget: '保存预算',
      budgetTotal: '预算总额',
      spent: '已支出',
      overspent: '已超支',
      budgetRemaining: '预算剩余',
      budgetProgress: '预算使用进度',
      projectedMonthEnd: '按当前节奏预计月末',
      dailyAllowance: '剩余日均可支出',
      budgetAdviceOverspent: (amount: number) => `本月已超支 ${formatAmountForTag('zh-CN', amount)}，建议暂停非必要支出。`,
      budgetAdviceProjected: (amount: number) => `按当前消费节奏，月末可能超预算 ${formatAmountForTag('zh-CN', amount)}。`,
      budgetAdviceFuture: (amount: number) => `这是未来月份预算，当前尚无支出记录，可按日均 ${formatAmountForTag('zh-CN', amount)} 规划。`,
      budgetAdvicePast: '这是已结束月份的预算复盘，可结合分类占比查看超支来源。',
      budgetAdviceCurrent: (days: number, amount: number) => `当前仍在预算内，接下来 ${days} 天建议日均控制在 ${formatAmountForTag('zh-CN', amount)} 左右。`,
      budgetFilterNote: '预算按全部支出计算，不受上方分类筛选影响。',
    },
  },
  en: {
    appName: 'GistLedger',
    appSubtitle: 'A private ledger powered by GitHub Gist',
    appTagline: 'Own your data · GitHub Gist · Responsive workspace',
    login: {
      tokenLabel: 'GitHub Token',
      tokenHint: 'Requires the `gist` scope. The token is stored only in your local browser.',
      connect: 'Connect Database',
      connected: 'Connected',
      syncing: 'Syncing data...',
      verifyingToken: 'Verifying token...',
      greeting: (user: string) => `Hi, ${user}! Looking for your Gist database...`,
      connectedDb: (id: string) => `Connected! Database ID: ${id}`,
      syncCompleted: (count: number) => `Sync complete. ${count} records loaded.`,
      connectFailed: 'Connection failed. Please check whether your token has the gist scope.',
      autoLoginFailed: 'Auto sign-in failed. Please reconnect.',
    },
    nav: {
      journal: 'Journal',
      history: 'History',
      stats: 'Insights',
      logout: 'Sign out',
    },
    common: {
      saving: 'Saving...',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      expense: 'Expense',
      income: 'Income',
      category: 'Category',
      amount: 'Amount',
      date: 'Date',
      notes: 'Notes',
      balance: 'Balance',
      languageToggle: 'Switch language',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeToggle: 'Toggle theme',
      start: 'Start',
      end: 'End',
      all: 'All',
      none: 'None',
      dash: '—',
      total: (value: number | string) => `Total: ${value}`,
      versusPrevious: (label: string) => `vs previous ${label}`,
    },
    dashboard: {
      syncStatus: 'Sync status',
      statusIdle: 'Waiting',
      statusSaving: 'Syncing',
      statusSaved: 'Cloud synced',
      statusError: 'Sync failed',
      lastSynced: (time: string) => `Last synced ${time}`,
      monthEntries: 'Entries this month',
      monthBalance: 'Monthly balance',
      monthBudget: 'Monthly budget',
      budgetUnset: 'No budget set',
      budgetOver: (amount: number) => `Over budget by ${formatAmountForTag('en-US', amount)}`,
      budgetRemaining: (amount: number) => `${formatAmountForTag('en-US', amount)} left`,
      fixedTemplates: 'Recurring templates',
      fixedTemplatesDesc: 'One-click entries for rent, subscriptions, salary, and more',
      fixedTemplatesPending: (count: number) => `${count} template items need attention`,
      fixedTemplatesAllClear: 'All recurring templates are covered this month',
      monthIncome: 'Income this month',
      monthExpense: 'Expense this month',
      overviewTitle: 'Month overview',
      overviewSubtitle: 'A quick glance at your current cash flow and template activity',
      recentRecords: 'Recent records',
      viewAll: 'View all',
      noRecords: 'No records yet. Add your first entry.',
      showingRecent: (shown: number, total: number) => `Showing ${shown} recent items / ${total} total`,
    },
    toast: {
      syncRollback: 'Sync failed. Reverted to the last successful state.',
      budgetRollback: 'Budget update failed. Reverted to the last successful state.',
      budgetSaved: 'Monthly budget synced to Gist.',
      budgetCleared: 'Monthly budget cleared.',
      newRecordSynced: 'New record synced to Gist.',
      recordDeleted: 'Record deleted and synced.',
      recordUpdated: 'Changes saved to Gist.',
      templateUpdated: 'Template updated.',
      templateCreated: 'Template created.',
      templateDeleted: 'Template deleted.',
      templateRollback: 'Template save failed. Reverted to the last successful state.',
      templateDeleteRollback: 'Template deletion failed. Reverted to the last successful state.',
    },
    form: {
      titleNew: 'Add Entry',
      titleEdit: 'Edit Entry',
      autoSync: 'Auto-sync to Gist',
      categoryPlaceholder: 'Type or choose a category',
      frequentCategories: 'Frequent categories',
      quickDate: 'Quick date',
      today: 'Today',
      yesterday: 'Yesterday',
      monthStart: 'Month start',
      budgetWarning: 'Budget alert',
      budgetLabel: (budget: number) => `Budget ${formatAmountForTag('en-US', budget)}`,
      expenseAfterSave: 'Monthly expense after save',
      remainingBudget: 'Budget remaining',
      projectedMonthExpense: 'Projected month-end expense',
      notesPlaceholder: 'Add a note...',
      saveChanges: 'Save Changes',
      confirmEntry: 'Save Entry',
      overspentAfterSave: (amount: number) => `This will exceed your monthly budget by ${formatAmountForTag('en-US', amount)}.`,
      dailyAllowanceTip: (amount: number) => `At this pace, try to keep daily spending within ${formatAmountForTag('en-US', amount)}.`,
      stillWithinBudget: 'This entry still stays within budget.',
    },
    template: {
      generic: 'General template',
      defaultDate: (date: string) => `Default date: ${date}`,
      recordedThisMonth: 'Logged this month',
      ledgerDay: (day: number) => `Recurring day: ${day} each month`,
      dueEntry: 'Due now',
      dueDate: (date: string) => `Scheduled for ${date}`,
      dueThisMonth: 'Due this month',
      confirmDelete: 'Delete this template?',
      title: 'Recurring templates',
      subtitle: 'Great for rent, subscriptions, salary, and other repeating entries',
      createNew: 'New template',
      count: 'Templates',
      due: 'Due',
      done: 'Done this month',
      editTitle: 'Edit template',
      createTitle: 'Create template',
      namePlaceholder: 'Template name, e.g. Rent or Salary',
      amountPlaceholder: 'Amount',
      expenseTemplate: 'Expense template',
      incomeTemplate: 'Income template',
      categoryPlaceholder: 'Category',
      schedulePlaceholder: 'Day of month, leave empty for a generic template',
      notesOptional: 'Note (optional)',
      saveTemplate: 'Save Template',
      createTemplate: 'Create Template',
      empty: 'No recurring templates yet. Add one to speed up repeated entries.',
      monthly: (day: number) => `${day} every month`,
      apply: 'Log Entry',
      remindersTitle: 'Template reminders',
      remindersSubtitle: 'Track recurring entries for this month so nothing gets missed',
      dueSection: 'Needs attention now',
      upcomingSection: 'Coming up later',
      allClear: 'No recurring templates are pending this month.',
      noUpcoming: 'Nothing upcoming for now.',
      quickLog: 'Quick log',
      dueCount: (count: number) => `${count} due now`,
      upcomingCount: (count: number) => `${count} upcoming`,
    },
    history: {
      confirmDelete: 'Delete this record?',
      filterTitle: 'Filters',
      searchPlaceholder: 'Search category or note...',
      quickRange: 'Quick range',
      thisMonth: 'This month',
      last30Days: 'Last 30 days',
      thisYear: 'This year',
      allTime: 'All time',
      filteredResult: 'Filtered result',
      exportCsv: 'CSV',
      exportJson: 'JSON',
      clear: 'Clear',
      typeLabel: (value: string) => `Type: ${value}`,
      keywordLabel: (value: string) => `Keyword: ${value}`,
      timeLabel: (start: string, end: string) => `Time: ${start || 'Start'} - ${end || 'End'}`,
      sortAdjusted: 'Custom sort applied',
      noMatch: 'No records match the current filters.',
      page: (current: number, total: number) => `Page ${current} / ${total}`,
      dateHeader: 'Date',
      categoryRemarkHeader: 'Category / Note',
      typeHeader: 'Type',
      amountHeader: 'Amount',
      actionHeader: 'Actions',
      sortDateDesc: 'Date: newest first',
      sortDateAsc: 'Date: oldest first',
      sortAmountDesc: 'Amount: high to low',
      sortAmountAsc: 'Amount: low to high',
    },
    stats: {
      noData: 'No data',
      top: (count: number) => `Top ${count}`,
      noBreakdown: 'No category data available.',
      monthView: 'Monthly',
      yearView: 'Yearly',
      period: 'Period',
      filterCategories: 'Filter categories',
      selectedCategories: (count: number) => `${count} categories selected`,
      backCurrent: 'Back to current',
      filteredRecords: (count: number) => `${count} records in current filter`,
      chooseCategory: 'Choose categories',
      clearFilter: 'Clear filters',
      noCategoryData: 'No categories available.',
      monthIncome: 'Income this month',
      yearIncome: 'Income this year',
      monthExpense: 'Expense this month',
      yearExpense: 'Expense this year',
      monthBalance: 'Balance this month',
      yearBalance: 'Balance this year',
      activity: 'Activity',
      entries: (count: number) => `${count} entries`,
      activeSummary: (days: number, categories: number) => `${days} active days · ${categories} categories`,
      monthTrendTitle: (year: number) => `${year} monthly trend`,
      yearTrendTitle: '5-year trend',
      accumulateByMonth: 'Accumulated by month',
      accumulateByYear: 'Accumulated by year',
      incomeTrend: 'Income trend',
      expenseTrend: 'Expense trend',
      insights: 'Insights',
      savingsRate: 'Savings rate',
      savingsRateHint: 'Balance ÷ income',
      topExpense: 'Top expense category',
      noExpense: 'No expense record in the current period.',
      topIncome: 'Top income category',
      noIncome: 'No income record in the current period.',
      expenseBreakdown: 'Expense breakdown',
      incomeBreakdown: 'Income breakdown',
      monthlyBudget: 'Monthly budget',
      setBudgetHint: 'Set a monthly expense budget to get real-time warnings while entering records.',
      setBudget: 'Set Budget',
      editBudget: 'Edit budget',
      clearBudget: 'Clear budget',
      modifyBudgetPlaceholder: 'Update your monthly expense budget',
      setBudgetPlaceholder: 'Set your monthly expense budget',
      saveBudget: 'Save Budget',
      budgetTotal: 'Budget total',
      spent: 'Spent',
      overspent: 'Over budget',
      budgetRemaining: 'Remaining budget',
      budgetProgress: 'Budget progress',
      projectedMonthEnd: 'Projected month end',
      dailyAllowance: 'Daily allowance left',
      budgetAdviceOverspent: (amount: number) => `You are already ${formatAmountForTag('en-US', amount)} over budget this month.`,
      budgetAdviceProjected: (amount: number) => `At the current pace, you may exceed budget by ${formatAmountForTag('en-US', amount)} by month end.`,
      budgetAdviceFuture: (amount: number) => `This is a future-month budget. You can plan around ${formatAmountForTag('en-US', amount)} per day.`,
      budgetAdvicePast: 'This is a completed month. Review the category breakdown to see what drove the overage.',
      budgetAdviceCurrent: (days: number, amount: number) => `You are still on track. Try to keep the next ${days} days within ${formatAmountForTag('en-US', amount)} per day.`,
      budgetFilterNote: 'Budget metrics are calculated from all expenses and ignore the category filter above.',
    },
  },
} as const;
