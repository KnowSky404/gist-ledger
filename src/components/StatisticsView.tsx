import React, { useMemo, useState } from 'react';
import type { LedgerItem } from '../services/gist';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Activity, Wallet } from 'lucide-react';
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
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // --- 数据处理 ---
  const stats = useMemo(() => {
    // 1. 本月数据
    const monthItems = items.filter(item => {
        const d = new Date(item.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const monthIncome = monthItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const monthExpense = monthItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);

    // 2. 本年数据
    const yearItems = items.filter(item => {
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
        month: { income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense },
        year: { income: yearIncome, expense: yearExpense, balance: yearIncome - yearExpense },
        trend: { income: monthlyTrendIncome, expense: monthlyTrendExpense }
    };
  }, [items, year, month]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            ←
        </button>
        <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-slate-800">{year}年 {month}月</span>
            <span className="text-xs text-slate-400">统计周期</span>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            →
        </button>
      </div>

      {/* 月度概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <TrendingUp size={16} /> 本月收入
            </div>
            <div className="text-2xl font-bold text-emerald-800">
                +{stats.month.income.toFixed(2)}
            </div>
        </div>
        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-rose-700 font-medium text-sm">
                <TrendingDown size={16} /> 本月支出
            </div>
            <div className="text-2xl font-bold text-rose-800">
                -{stats.month.expense.toFixed(2)}
            </div>
        </div>
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between h-32">
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                <Wallet size={16} /> 本月结余
            </div>
            <div className={cn("text-2xl font-bold", stats.month.balance >= 0 ? "text-slate-800" : "text-rose-600")}>
                {stats.month.balance > 0 ? '+' : ''}{stats.month.balance.toFixed(2)}
            </div>
        </div>
      </div>

      {/* 年度趋势图表 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="text-indigo-500" size={18} />
                {year}年度趋势
            </h3>
        </div>

        <div className="space-y-4">
            <div>
                <div className="flex justify-between text-xs text-emerald-600 mb-1 font-medium">
                    <span>收入趋势</span>
                    <span>总计: {stats.year.income.toFixed(0)}</span>
                </div>
                <SimpleLineChart data={stats.trend.income} color="#10b981" height={80} />
            </div>
            
            <div className="pt-4 border-t border-slate-50">
                <div className="flex justify-between text-xs text-rose-600 mb-1 font-medium">
                    <span>支出趋势</span>
                    <span>总计: {stats.year.expense.toFixed(0)}</span>
                </div>
                <SimpleLineChart data={stats.trend.expense} color="#f43f5e" height={80} />
            </div>
        </div>
        
        {/* X轴月份标签 */}
        <div className="flex justify-between px-1 text-xs text-slate-400">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(m => (
                <span key={m}>{m}月</span>
            ))}
        </div>
      </div>
    </div>
  );
};
