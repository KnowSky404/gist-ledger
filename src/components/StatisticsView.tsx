import React, { useMemo, useState } from 'react';
import type { LedgerItem } from '../services/gist';
import { TrendingUp, TrendingDown, Activity, Wallet, Filter, X, Calendar, BarChart3 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatisticsViewProps {
  items: LedgerItem[];
}

// 简单的 SVG折线图组件
const SimpleLineChart = ({ data, color, height = 100 }: { data: number[], color: string, height?: number }) => {
  if (data.length === 0 || data.every(d => d === 0)) {
    return (
        <div className="flex items-center justify-center text-gray-400 text-xs h-full" style={{ height }}>
            暂无数据
        </div>
    )
  }

  const max = Math.max(...data);
  const min = 0; // 总是从0开始，比较直观
  const range = max - min || 1; 
  
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative w-full" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            {/* 渐变填充 */}
            <defs>
                <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                    <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
            </defs>
            <path d={`M0,100 L0,${100 - ((data[0] - min) / range) * 100} ${data.map((val, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = 100 - ((val - min) / range) * 100;
                return `L${x},${y}`;
            }).join(' ')} L100,100 Z`} fill={`url(#grad-${color})`} stroke="none" />
            
            {/* 折线 */}
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </div>
  );
};


export const StatisticsView: React.FC<StatisticsViewProps> = ({ items }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // --- 提取分类 ---
  const categories = useMemo(() => {
    const income = new Set<string>();
    const expense = new Set<string>();

    items.forEach(item => {
      if (item.type === 'income') income.add(item.category);
      else expense.add(item.category);
    });

    return {
      income: Array.from(income),
      expense: Array.from(expense)
    };
  }, [items]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const clearFilter = () => setSelectedCategories([]);

  // --- 数据处理 ---
  const stats = useMemo(() => {
    // 先根据分类筛选
    const filteredItems = items.filter(item => 
      selectedCategories.length === 0 || selectedCategories.includes(item.category)
    );

    // 1. 本月数据
    const monthItems = filteredItems.filter(item => {
        const d = new Date(item.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const monthIncome = monthItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const monthExpense = monthItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);

    // 计算月度每日趋势
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTrendIncome = Array(daysInMonth).fill(0);
    const dailyTrendExpense = Array(daysInMonth).fill(0);

    monthItems.forEach(item => {
        const d = new Date(item.date).getDate() - 1; // 0-based index
        if (d >= 0 && d < daysInMonth) {
            if (item.type === 'income') dailyTrendIncome[d] += item.amount;
            else dailyTrendExpense[d] += item.amount;
        }
    });

    // 2. 本年数据
    const yearItems = filteredItems.filter(item => {
        const d = new Date(item.date);
        return d.getFullYear() === year;
    });

    const yearIncome = yearItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const yearExpense = yearItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);

    // 3. 年度趋势 (12个月)
    const monthlyTrendIncome = Array(12).fill(0);
    const monthlyTrendExpense = Array(12).fill(0);
    
    yearItems.forEach(item => {
        const m = new Date(item.date).getMonth(); // 0-11
        if (item.type === 'income') monthlyTrendIncome[m] += item.amount;
        else monthlyTrendExpense[m] += item.amount;
    });

    return {
        month: { 
            income: monthIncome, 
            expense: monthExpense, 
            balance: monthIncome - monthExpense,
            trend: { income: dailyTrendIncome, expense: dailyTrendExpense }
        },
        year: { 
            income: yearIncome, 
            expense: yearExpense, 
            balance: yearIncome - yearExpense,
            trend: { income: monthlyTrendIncome, expense: monthlyTrendExpense }
        }
    };
  }, [items, year, month, selectedCategories]);

  const changeDate = (offset: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + offset);
    } else {
        newDate.setFullYear(newDate.getFullYear() + offset);
    }
    setCurrentDate(newDate);
  };

  const currentStats = viewMode === 'month' ? stats.month : stats.year;
  const currentTrend = currentStats.trend;

  // X轴标签生成
  const xAxisLabels = useMemo(() => {
    if (viewMode === 'year') {
        return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    }
    // 月视图：显示 1, 5, 10, 15, 20, 25, (end)
    const days = stats.month.trend.income.length;
    return Array.from({length: days}, (_, i) => i + 1).filter(d => d === 1 || d % 5 === 0);
  }, [viewMode, stats.month.trend.income.length]);

  return (
    <div className="space-y-6">
      
      {/* 顶部控制栏 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
        
        {/* 视图切换 Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-center">
            <button 
                onClick={() => setViewMode('month')}
                className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === 'month' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
            >
                <Calendar size={16} /> 月度统计
            </button>
            <button 
                onClick={() => setViewMode('year')}
                className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === 'year' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
            >
                <BarChart3 size={16} /> 年度统计
            </button>
        </div>

        <div className="flex items-center justify-between mt-2">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                ←
            </button>
            <div className="flex flex-col items-center">
                <span className="font-bold text-lg text-slate-800">
                    {viewMode === 'month' ? `${year}年 ${month}月` : `${year}年`}
                </span>
                <span className="text-xs text-slate-400">统计周期</span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                →
            </button>
        </div>

        {/* 筛选按钮区 */}
        <div className="flex justify-center border-t border-slate-50 pt-3">
             <button 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all",
                    isFilterExpanded || selectedCategories.length > 0 
                        ? "bg-slate-100 text-slate-800 font-medium" 
                        : "text-slate-500 hover:bg-slate-50"
                )}
             >
                <Filter size={16} />
                {selectedCategories.length > 0 ? `已选 ${selectedCategories.length} 个分类` : "筛选分类"}
             </button>
        </div>

        {/* 筛选面板 (保持不变) */}
        {isFilterExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">选择分类</span>
                        {selectedCategories.length > 0 && (
                            <button onClick={clearFilter} className="text-xs text-slate-500 flex items-center gap-1 hover:text-rose-500 transition-colors">
                                <X size={12} /> 清除筛选
                            </button>
                        )}
                    </div>

                    {/* 支出分类 */}
                    {categories.expense.length > 0 && (
                        <div>
                            <span className="text-xs text-slate-400 mb-2 block">支出</span>
                            <div className="flex flex-wrap gap-2">
                                {categories.expense.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-sm border transition-all",
                                            selectedCategories.includes(cat)
                                                ? "bg-rose-100 border-rose-200 text-rose-700 shadow-sm"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-rose-200"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 收入分类 */}
                    {categories.income.length > 0 && (
                        <div>
                            <span className="text-xs text-slate-400 mb-2 block">收入</span>
                            <div className="flex flex-wrap gap-2">
                                {categories.income.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-sm border transition-all",
                                            selectedCategories.includes(cat)
                                                ? "bg-emerald-100 border-emerald-200 text-emerald-700 shadow-sm"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {(categories.income.length === 0 && categories.expense.length === 0) && (
                        <div className="text-center text-slate-400 text-sm py-2">
                            暂无分类数据
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* 概览卡片 (动态显示月/年数据) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <TrendingUp size={16} /> {viewMode === 'month' ? '本月' : '本年'}收入
            </div>
            <div className="text-2xl font-bold text-emerald-800">
                +{currentStats.income.toFixed(2)}
            </div>
        </div>
        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-rose-700 font-medium text-sm">
                <TrendingDown size={16} /> {viewMode === 'month' ? '本月' : '本年'}支出
            </div>
            <div className="text-2xl font-bold text-rose-800">
                -{currentStats.expense.toFixed(2)}
            </div>
        </div>
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                <Wallet size={16} /> {viewMode === 'month' ? '本月' : '本年'}结余
            </div>
            <div className={cn("text-2xl font-bold", currentStats.balance >= 0 ? "text-slate-800" : "text-rose-600")}>
                {currentStats.balance > 0 ? '+' : ''}{currentStats.balance.toFixed(2)}
            </div>
        </div>
      </div>

      {/* 趋势图表 (动态显示每日/每月趋势) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="text-indigo-500" size={18} />
                {viewMode === 'month' ? `${month}月 每日趋势` : `${year}年 月度趋势`}
            </h3>
        </div>

        <div className="space-y-4">
            <div>
                <div className="flex justify-between text-xs text-emerald-600 mb-1 font-medium">
                    <span>收入趋势</span>
                    <span>总计: {currentStats.income.toFixed(0)}</span>
                </div>
                <SimpleLineChart data={currentTrend.income} color="#10b981" height={80} />
            </div>
            
            <div className="pt-4 border-t border-slate-50">
                <div className="flex justify-between text-xs text-rose-600 mb-1 font-medium">
                    <span>支出趋势</span>
                    <span>总计: {currentStats.expense.toFixed(0)}</span>
                </div>
                <SimpleLineChart data={currentTrend.expense} color="#f43f5e" height={80} />
            </div>
        </div>
        
        {/* X轴标签 */}
        <div className="flex justify-between px-1 text-xs text-slate-400">
            {viewMode === 'year' 
                ? xAxisLabels.map(m => <span key={m}>{m}</span>)
                : xAxisLabels.map(d => <span key={d}>{d}日</span>)
            }
        </div>
      </div>
    </div>
  );
};

