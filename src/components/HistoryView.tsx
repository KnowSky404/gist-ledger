import React, { useState, useMemo } from 'react';
import type { LedgerItem } from '../services/gist';
import { Search, Filter, Trash2, Edit2, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryViewProps {
  items: LedgerItem[];
  onDelete: (id: string) => void;
  onUpdate: (item: LedgerItem) => void;
  isLoading: boolean;
}

const PAGE_SIZE = 10;

export const HistoryView: React.FC<HistoryViewProps> = ({ items, onDelete, onUpdate, isLoading }) => {
  // Filter States
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchRemark, setSearchRemark] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Edit State
  const [editingItem, setEditingItem] = useState<LedgerItem | null>(null);

  // --- Filtering Logic ---
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Type Filter
      if (filterType !== 'all' && item.type !== filterType) return false;

      // 2. Date Range Filter
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // 3. Search Filter (Category or Remark)
      if (searchRemark) {
        const query = searchRemark.toLowerCase();
        const matchCategory = item.category.toLowerCase().includes(query);
        const matchRemark = item.remark?.toLowerCase().includes(query);
        if (!matchCategory && !matchRemark) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date desc
  }, [items, filterType, startDate, endDate, searchRemark]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const currentItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterType, startDate, endDate, searchRemark]);

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      onDelete(id);
    }
  };

  const handleEditSubmit = (updatedItem: LedgerItem) => {
    onUpdate(updatedItem);
    setEditingItem(null);
  };

  // --- Render Edit Modal ---
  if (editingItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md">
            <TransactionForm 
                key={editingItem.id}
                initialData={editingItem} 
                onSubmit={handleEditSubmit} 
                isLoading={isLoading}
                onCancel={() => setEditingItem(null)}
            />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选工具栏 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Filter size={18} className="text-indigo-500" />
            查询筛选
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 类型筛选 */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['all', 'expense', 'income'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={cn(
                            "flex-1 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                            filterType === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {t === 'all' ? '全部' : (t === 'expense' ? '支出' : '收入')}
                    </button>
                ))}
            </div>

            {/* 关键词搜索 */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="搜索分类或备注..." 
                    value={searchRemark}
                    onChange={(e) => setSearchRemark(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>
        </div>

        {/* 日期范围 */}
        <div className="flex items-center gap-2 text-sm">
            <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
            />
            <span className="text-slate-400">-</span>
            <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
            />
            {(startDate || endDate) && (
                <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                    <X size={16} />
                </button>
            )}
        </div>
      </div>

      {/* 列表显示 */}
      <div className="space-y-3">
        {currentItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                <Inbox size={48} className="text-slate-200" />
                <p>没有找到符合条件的记录</p>
            </div>
        ) : (
            currentItems.map((item) => (
                <div key={item.id} className="group bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{item.category}</span>
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                item.type === 'expense' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                                {item.type === 'expense' ? '支出' : '收入'}
                            </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{item.date}</span>
                            {item.remark && <span>· {item.remark}</span>}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span className={cn(
                            "text-lg font-bold font-mono",
                            item.type === 'expense' ? "text-slate-800" : "text-emerald-600"
                        )}>
                            {item.type === 'expense' ? '-' : '+'}{item.amount.toFixed(2)}
                        </span>
                        
                        {/* 操作按钮 (Hover时显示，移动端常驻或点击显示，这里简化为常驻但淡色) */}
                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => setEditingItem(item)}
                                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
            <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-slate-600">
                {currentPage} / {totalPages}
            </span>
            <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      )}
    </div>
  );
};
